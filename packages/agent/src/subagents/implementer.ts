import { query } from "@anthropic-ai/claude-agent-sdk";
import { asc, eq } from "drizzle-orm";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { getDb, projects, taskComments, tasks, logger, incrementTaskTokenUsage } from "@aif/shared";
import { createActivityLogger, createSubagentLogger, logActivity, getClaudePath } from "../hooks.js";
import { writeQueryAudit } from "../queryAudit.js";
import { computePendingPlanLayers, computePlanLayers, formatLayerSummary } from "../planLayers.js";
import {
  createClaudeStderrCollector,
  explainClaudeFailure,
  probeClaudeCliFailure,
} from "../claudeDiagnostics.js";

const log = logger("implementer");
const AGENT_NAME = "implement-coordinator";
const FIX_PLAN_PATH = ".ai-factory/FIX_PLAN.md";
const PLAN_PATH = ".ai-factory/PLAN.md";
const CHECKLIST_INCOMPLETE_ERROR = "Plan checklist incomplete after implementation sync";
const PROJECT_SCOPE_SYSTEM_APPEND =
  "Project scope rule: work strictly inside the current working directory (project root). " +
  "Do not inspect or modify files in the orchestrator monorepo or in parent/sibling directories " +
  "unless the user explicitly asks for that path. Avoid broad discovery outside the current project root.";

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

function formatLatestHumanCommentForPrompt(comment: {
  createdAt: string;
  message: string;
  attachments: string | null;
} | null): string {
  if (!comment) return "No human comments found for rework request.";
  return [
    `[${comment.createdAt}] human`,
    `message: ${comment.message}`,
    "attachments:",
    formatTaskAttachmentsForPrompt(comment.attachments),
  ].join("\n");
}

function isBlockedImplementationResult(resultText: string): boolean {
  const normalized = resultText.toLowerCase();
  return (
    normalized.includes("status: blocked") ||
    normalized.includes("permission system") ||
    normalized.includes("permission denied") ||
    normalized.includes("write permission") ||
    normalized.includes("cannot proceed") ||
    normalized.includes("blocked —")
  );
}

function hasClaudeStreamInterruption(stderrTail: string): boolean {
  const normalized = stderrTail.toLowerCase();
  return normalized.includes("stream closed") || normalized.includes("error in hook callback");
}

function readCanonicalPlan(task: { isFix: boolean }, projectRoot: string): string | null {
  const preferredPath = resolve(projectRoot, task.isFix ? FIX_PLAN_PATH : PLAN_PATH);
  if (existsSync(preferredPath)) {
    const content = readFileSync(preferredPath, "utf8").trim();
    if (content.length > 0) return content;
  }

  const fallbackPath = resolve(projectRoot, task.isFix ? PLAN_PATH : FIX_PLAN_PATH);
  if (existsSync(fallbackPath)) {
    const content = readFileSync(fallbackPath, "utf8").trim();
    if (content.length > 0) return content;
  }

  return null;
}

function resolveCanonicalPlanPath(task: { isFix: boolean }, projectRoot: string): string {
  const preferredPath = resolve(projectRoot, task.isFix ? FIX_PLAN_PATH : PLAN_PATH);
  if (existsSync(preferredPath)) return preferredPath;
  const fallbackPath = resolve(projectRoot, task.isFix ? PLAN_PATH : FIX_PLAN_PATH);
  if (existsSync(fallbackPath)) return fallbackPath;
  return preferredPath;
}

function persistCanonicalPlan(task: { isFix: boolean }, projectRoot: string, content: string): void {
  const canonicalPath = resolveCanonicalPlanPath(task, projectRoot);
  mkdirSync(dirname(canonicalPath), { recursive: true });
  writeFileSync(canonicalPath, `${content.trimEnd()}\n`, "utf8");
}

function getChecklistProgress(planText: string | null): { parsedTaskCount: number; pendingTaskCount: number } {
  if (!planText) return { parsedTaskCount: 0, pendingTaskCount: 0 };
  const parsed = computePlanLayers(planText);
  const pending = computePendingPlanLayers(planText);
  return {
    parsedTaskCount: parsed.tasks.length,
    pendingTaskCount: pending.tasks.length,
  };
}

function extractHeadings(markdown: string): string[] {
  return markdown
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^#{1,6}\s+/.test(line))
    .map((line) => line.replace(/^#{1,6}\s+/, "").toLowerCase());
}

function looksLikeFullPlanUpdate(previousPlan: string, updatedPlan: string): boolean {
  const prev = previousPlan.trim();
  const next = updatedPlan.trim();
  if (!prev) return next.length > 0;
  if (!next) return false;
  const minLength = prev.length < 120
    ? Math.max(10, Math.floor(prev.length * 0.6))
    : Math.max(80, Math.floor(prev.length * 0.5));
  if (next.length < minLength) return false;

  const prevHeadings = extractHeadings(prev);
  if (prev.length < 400 || prevHeadings.length === 0) return true;
  const nextHeadings = new Set(extractHeadings(next));
  return prevHeadings.some((heading) => nextHeadings.has(heading));
}

async function runChecklistSyncQuery(input: {
  task: typeof tasks.$inferSelect;
  projectRoot: string;
  planText: string;
  implementationResult: string;
}): Promise<string> {
  let resultText = "";
  const prompt = `You are finalizing task checklist state in a markdown implementation plan.

TASK TITLE:
${input.task.title}

TASK DESCRIPTION:
${input.task.description}

IMPLEMENTATION RESULT LOG (source of truth for what was done):
${input.implementationResult}

CURRENT PLAN MARKDOWN:
<<<CURRENT_PLAN
${input.planText}
CURRENT_PLAN

Requirements:
1) Return the FULL updated plan markdown.
2) Update only checkbox states ("- [ ]" / "- [x]") to reflect implemented work from the log.
3) Do not rewrite structure, titles, ordering, prose, or dependencies.
4) Preserve all unchecked tasks that are not completed yet.
5) Output markdown only.
6) Do not use tools or subagents.`;

  for await (const message of query({
    prompt,
    options: {
      cwd: input.projectRoot,
      settingSources: ["project"],
      model: "haiku",
      maxThinkingTokens: 1024,
      systemPrompt: {
        type: "preset",
        preset: "claude_code",
        append: "Do not use tools or subagents. Reply directly with markdown only.",
      },
    },
  })) {
    if (message.type !== "result") continue;
    incrementTaskTokenUsage(input.task.id, {
      ...message.usage,
      total_cost_usd: message.total_cost_usd,
    });
    if (message.subtype !== "success") {
      throw new Error(`Checklist sync failed: ${message.subtype}`);
    }
    resultText = message.result.trim();
  }

  if (!resultText) {
    throw new Error("Checklist sync did not return plan markdown");
  }
  return resultText;
}

function formatParsedPlanTasksForPrompt(
  parsedTasks: Array<{
    number: number;
    description: string;
    phase: number;
    explicitDependencies: number[];
    completed: boolean;
  }>,
  hasPlanText: boolean
): string {
  if (!hasPlanText) return "No plan text available.";
  if (parsedTasks.length === 0) {
    return (
      "No structured checklist/tasks were parsed from plan. " +
      "Interpret the plan text directly and decide actionable implementation steps."
    );
  }

  return parsedTasks
    .sort((a, b) => a.number - b.number)
    .map((task) => {
      const state = task.completed ? "completed" : "pending";
      const deps = task.explicitDependencies.length > 0
        ? `; deps: ${task.explicitDependencies.join(", ")}`
        : "";
      return `- Task ${task.number} [${state}] (phase ${task.phase}): ${task.description}${deps}`;
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
  const project = db.select().from(projects).where(eq(projects.id, task.projectId)).get();
  const implementerBudget = project?.implementerMaxBudgetUsd ?? null;
  const canonicalPlan = readCanonicalPlan(task, projectRoot);
  const selectedPlan = canonicalPlan ?? task.plan;
  const planSection = task.isFix
    ? `Primary plan file (use first): @${FIX_PLAN_PATH}
Fallback in-task plan copy:
${selectedPlan ?? "No in-task plan copy is available."}`
    : `${selectedPlan ?? "No plan available — use your best judgment."}`;
  const layerComputation = selectedPlan
    ? computePendingPlanLayers(selectedPlan)
    : { tasks: [], layers: [] };
  const parsedPlanComputation = selectedPlan ? computePlanLayers(selectedPlan) : { tasks: [], layers: [] };
  const parsedTasksSummary = formatParsedPlanTasksForPrompt(
    parsedPlanComputation.tasks,
    Boolean(selectedPlan)
  );
  const parsedTaskCount = parsedPlanComputation.tasks.length;
  const hasParallelLayer = layerComputation.layers.some((layer) => layer.length > 1);
  const layerSummary = formatLayerSummary(layerComputation.layers);
  const pendingTaskCount = layerComputation.tasks.length;
  const latestHumanComment = task.reworkRequested
    ? db
        .select()
        .from(taskComments)
        .where(eq(taskComments.taskId, taskId))
        .orderBy(asc(taskComments.createdAt), asc(taskComments.id))
        .all()
        .filter((comment) => comment.author === "human")
        .at(-1) ?? null
    : null;

  if (selectedPlan && parsedTaskCount > 0 && pendingTaskCount === 0 && !task.reworkRequested) {
    const nowIso = new Date().toISOString();
    const noOpResult =
      "No pending tasks detected in plan (all tasks already completed). " +
      "Implementer skipped coordinator execution.";
    db.update(tasks)
      .set({
        plan: selectedPlan,
        implementationLog: noOpResult,
        lastHeartbeatAt: nowIso,
        updatedAt: nowIso,
      })
      .where(eq(tasks.id, taskId))
      .run();
    logActivity(taskId, "Agent", `${AGENT_NAME} skipped — no pending tasks in plan`);
    log.info({ taskId }, "Implementer no-op: all plan tasks already completed");
    return;
  }

  log.info({ taskId, title: task.title }, "Starting implement-worker agent");

  const prompt = `Implement the following task according to the plan.

IMPORTANT: Your working directory is ${projectRoot}
All files must be created and modified inside this directory. Do NOT create files outside of it.

Title: ${task.title}
Description: ${task.description}
Task attachments:
${formatTaskAttachmentsForPrompt(task.attachments)}

Plan:
${planSection}

Parsed plan tasks (status + dependencies extracted by orchestrator):
${parsedTasksSummary}

Precomputed execution layers (source of truth from orchestrator):
${layerSummary}

${task.reworkRequested
  ? `Rework mode: true (requested from done/request_changes).
Latest human rework comment (must be addressed in this implementation run):
${formatLatestHumanCommentForPrompt(latestHumanComment)}`
  : "Rework mode: false."}

Execution rules:
- Respect the precomputed layers above as authoritative dependency order.
- Any layer with multiple tasks MUST be executed via parallel \`implement-worker\` dispatch.
- Do not collapse parallel layers into sequential execution unless blocked by explicit conflicts.
- Run quality sidecars (review, security, best-practices) and verify the merged result.`;

  let resultText = "";
  let implementWorkerStarts = 0;
  const stderrCollector = createClaudeStderrCollector();
  const heartbeatTimer = setInterval(() => {
    const nowIso = new Date().toISOString();
    db.update(tasks)
      .set({ lastHeartbeatAt: nowIso, updatedAt: nowIso })
      .where(eq(tasks.id, taskId))
      .run();
  }, 30_000);

  logActivity(taskId, "Agent", `${AGENT_NAME} started`);
  writeQueryAudit({
    timestamp: new Date().toISOString(),
    taskId,
    agentName: AGENT_NAME,
    projectRoot,
    prompt,
    options: {
      settingSources: ["project"],
      maxBudgetUsd: implementerBudget,
      systemPrompt: {
        type: "preset",
        preset: "claude_code",
        append: PROJECT_SCOPE_SYSTEM_APPEND,
      },
    },
  });

  try {
    for await (const message of query({
      prompt,
      options: {
        cwd: projectRoot,
        env: process.env,
        pathToClaudeCodeExecutable: getClaudePath(),
        settingSources: ["project"],
        permissionMode: "acceptEdits",
        systemPrompt: {
          type: "preset",
          preset: "claude_code",
          append: PROJECT_SCOPE_SYSTEM_APPEND,
        },
        extraArgs: { agent: AGENT_NAME },
        ...(implementerBudget == null ? {} : { maxBudgetUsd: implementerBudget }),
        stderr: stderrCollector.onStderr,
        hooks: {
          PostToolUse: [
            { hooks: [createActivityLogger(taskId)] },
          ],
          SubagentStart: [
            { hooks: [createSubagentLogger(taskId)] },
            {
              hooks: [async (input) => {
                const data = input as Record<string, unknown>;
                const agentName = String(
                  data.agent_name ?? data.subagent_type ?? data.agent_type ?? data.description ?? "",
                ).toLowerCase();
                if (agentName.includes("implement-worker")) {
                  implementWorkerStarts += 1;
                }
                return {};
              }],
            },
          ],
        },
      },
    })) {
      if (message.type === "result") {
        incrementTaskTokenUsage(taskId, {
          ...message.usage,
          total_cost_usd: message.total_cost_usd,
        });
        if (message.subtype === "success") {
          resultText = message.result;
          log.info({ taskId }, "implement-worker completed successfully");
        } else {
          logActivity(taskId, "Agent", `${AGENT_NAME} ended (${message.subtype})`);
          log.warn({ taskId, subtype: message.subtype }, "Implementer ended with non-success");
          throw new Error(`Implementer failed: ${message.subtype}`);
        }
      }
    }

    if (isBlockedImplementationResult(resultText)) {
      throw new Error("Implementer blocked by permissions");
    }

    if (hasParallelLayer && implementWorkerStarts === 0) {
      const stderrTail = stderrCollector.getTail();
      if (hasClaudeStreamInterruption(stderrTail)) {
        throw new Error("Claude stream interrupted before implement-worker dispatch");
      }
      log.warn(
        { taskId, pendingLayerSummary: layerSummary },
        "Implementer finished without implement-worker dispatch for pending parallel layers"
      );
      resultText = `${resultText}\n\n[warning] No implement-worker dispatch detected for pending parallel layers. Execution was accepted in fallback mode.`;
    }

    let syncedPlan = readCanonicalPlan(task, projectRoot) ?? task.plan;
    let checklistAutoSynced = false;
    const checklistBeforeSync = getChecklistProgress(syncedPlan);

    if (syncedPlan && checklistBeforeSync.parsedTaskCount > 0 && checklistBeforeSync.pendingTaskCount > 0) {
      const repairedPlan = await runChecklistSyncQuery({
        task,
        projectRoot,
        planText: syncedPlan,
        implementationResult: resultText,
      });
      if (looksLikeFullPlanUpdate(syncedPlan, repairedPlan)) {
        syncedPlan = repairedPlan;
        persistCanonicalPlan(task, projectRoot, repairedPlan);
        checklistAutoSynced = true;
      } else {
        log.warn({ taskId }, "Checklist auto-sync returned non-plan-like response, keeping original plan");
      }
    }

    const checklistAfterSync = getChecklistProgress(syncedPlan);
    if (syncedPlan && checklistAfterSync.parsedTaskCount > 0 && checklistAfterSync.pendingTaskCount > 0) {
      const failureLog = `${resultText}\n\n[warning] Checklist remains incomplete after auto-sync: ${checklistAfterSync.pendingTaskCount} pending task(s).`;
      db.update(tasks)
        .set({
          plan: syncedPlan,
          implementationLog: failureLog,
          lastHeartbeatAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(tasks.id, taskId))
        .run();
      throw new Error(CHECKLIST_INCOMPLETE_ERROR);
    }

    const finalResultText = checklistAutoSynced
      ? `${resultText}\n\n[note] Plan checklist auto-synced after implementation.`
      : resultText;

    // Save implementation log (+ synced plan snapshot when available)
    db.update(tasks)
      .set({
        ...(syncedPlan ? { plan: syncedPlan } : {}),
        implementationLog: finalResultText,
        reworkRequested: false,
        lastHeartbeatAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(tasks.id, taskId))
      .run();

    logActivity(taskId, "Agent", `${AGENT_NAME} complete`);
    log.debug({ taskId }, "Implementation log saved to task");
  } catch (err) {
    if (err instanceof Error && err.message.includes(CHECKLIST_INCOMPLETE_ERROR)) {
      logActivity(taskId, "Agent", `${AGENT_NAME} failed — ${err.message}`);
      log.warn({ taskId, err }, "Implementer checklist guard triggered");
      throw err;
    }

    let detail = stderrCollector.getTail();
    if (!detail) {
      detail = await probeClaudeCliFailure(projectRoot, getClaudePath());
    }
    const reason = explainClaudeFailure(err, detail);
    logActivity(taskId, "Agent", `${AGENT_NAME} failed — ${reason}`);
    log.error({ taskId, err, claudeStderr: detail }, "Implementer execution failed");
    throw new Error(reason, { cause: err });
  } finally {
    clearInterval(heartbeatTimer);
  }
}
