import { query } from "@anthropic-ai/claude-agent-sdk";
import { eq } from "drizzle-orm";
import { getDb, tasks, logger } from "@aif/shared";
import { createActivityLogger, createSubagentLogger, flushActivityLog, getClaudePath } from "../hooks.js";
import {
  createClaudeStderrCollector,
  explainClaudeFailure,
  probeClaudeCliFailure,
} from "../claudeDiagnostics.js";

const log = logger("implementer");

function parseAttachments(raw: string | null): Array<{
  name: string;
  mimeType: string;
  size: number;
  content: string | null;
}> {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && typeof item === "object")
      .map((item) => ({
        name: typeof item.name === "string" ? item.name : "file",
        mimeType: typeof item.mimeType === "string" ? item.mimeType : "application/octet-stream",
        size: typeof item.size === "number" ? item.size : 0,
        content: typeof item.content === "string" ? item.content : null,
      }));
  } catch {
    return [];
  }
}

function formatTaskAttachmentsForPrompt(raw: string | null): string {
  const attachments = parseAttachments(raw);
  if (attachments.length === 0) return "No task attachments were provided.";

  return attachments
    .map((file, index) => {
      const contentBlock = file.content
        ? `\n    content:\n${file.content
            .slice(0, 4000)
            .split("\n")
            .map((line) => `      ${line}`)
            .join("\n")}`
        : "\n    content: [not provided]";
      return `${index + 1}. ${file.name} (${file.mimeType}, ${file.size} bytes)${contentBlock}`;
    })
    .join("\n");
}

export async function runImplementer(taskId: string, projectRoot: string): Promise<void> {
  const db = getDb();
  const task = db.select().from(tasks).where(eq(tasks.id, taskId)).get();

  if (!task) {
    log.error({ taskId }, "Task not found for implementation");
    throw new Error(`Task ${taskId} not found`);
  }

  log.info({ taskId, title: task.title }, "Starting implement-worker agent");

  const prompt = `Implement the following task according to the plan.

Title: ${task.title}
Description: ${task.description}
Task attachments:
${formatTaskAttachmentsForPrompt(task.attachments)}

Plan:
${task.plan ?? "No plan available — use your best judgment."}

Execute all plan tasks using parallel workers where possible, run quality sidecars (review, security, best-practices), and verify the result.`;

  let resultText = "";
  const stderrCollector = createClaudeStderrCollector();

  try {
    for await (const message of query({
      prompt,
      options: {
        cwd: projectRoot,
        env: process.env,
        pathToClaudeCodeExecutable: getClaudePath(),
        settingSources: ["project"],
        extraArgs: { agent: "implement-coordinator" },
        allowedTools: ["Agent", "Read", "Write", "Edit", "Glob", "Grep", "Bash"],
        maxTurns: 30,
        maxBudgetUsd: 3.0,
        permissionMode: "acceptEdits",
        stderr: stderrCollector.onStderr,
        hooks: {
          PostToolUse: [
            { hooks: [createActivityLogger(taskId)] },
          ],
          SubagentStart: [
            { hooks: [createSubagentLogger(taskId)] },
          ],
        },
      },
    })) {
      if (message.type === "result") {
        if (message.subtype === "success") {
          resultText = message.result;
          log.info({ taskId }, "implement-worker completed successfully");
        } else {
          flushActivityLog(taskId, `Implementer ended: ${message.subtype}`);
          log.warn({ taskId, subtype: message.subtype }, "Implementer ended with non-success");
          throw new Error(`Implementer failed: ${message.subtype}`);
        }
      }
    }

    // Save implementation log
    db.update(tasks)
      .set({
        implementationLog: resultText,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(tasks.id, taskId))
      .run();

    flushActivityLog(taskId, "Implementation complete (implement-worker)");
    log.debug({ taskId }, "Implementation log saved to task");
  } catch (err) {
    let detail = stderrCollector.getTail();
    if (!detail) {
      detail = await probeClaudeCliFailure(projectRoot, getClaudePath());
    }
    const reason = explainClaudeFailure(err, detail);
    flushActivityLog(taskId, `Implementation failed: ${reason}`);
    log.error({ taskId, err, claudeStderr: detail }, "Implementer execution failed");
    throw new Error(reason, { cause: err });
  }
}
