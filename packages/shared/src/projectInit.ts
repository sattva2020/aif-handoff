import { existsSync, mkdirSync, cpSync } from "node:fs";
import { resolve } from "node:path";
import { execSync } from "node:child_process";
import { logger } from "./logger.js";
import { findMonorepoRootFromUrl } from "./monorepoRoot.js";

const log = logger("project-init");

const MONOREPO_ROOT = findMonorepoRootFromUrl(import.meta.url);

/**
 * Initialize a project directory with .claude/ (agents + skills), .ai-factory/, and git repo.
 * Safe to call multiple times — skips steps that are already done.
 */
export function initProjectDirectory(projectRoot: string): void {
  mkdirSync(projectRoot, { recursive: true });

  const targetClaude = resolve(projectRoot, ".claude");
  const targetAiFactory = resolve(projectRoot, ".ai-factory");

  if (!existsSync(targetAiFactory)) {
    mkdirSync(targetAiFactory, { recursive: true });
    log.info({ projectRoot }, "Created .ai-factory directory");
  }

  // Copy .claude/agents/
  const sourceAgents = resolve(MONOREPO_ROOT, ".claude/agents");
  const targetAgents = resolve(targetClaude, "agents");
  if (existsSync(sourceAgents) && !existsSync(targetAgents)) {
    mkdirSync(targetClaude, { recursive: true });
    cpSync(sourceAgents, targetAgents, { recursive: true });
    log.info({ projectRoot }, "Copied .claude/agents/ to project");
  }

  // Copy .claude/skills/
  const sourceSkills = resolve(MONOREPO_ROOT, ".claude/skills");
  const targetSkills = resolve(targetClaude, "skills");
  if (existsSync(sourceSkills) && !existsSync(targetSkills)) {
    mkdirSync(targetClaude, { recursive: true });
    cpSync(sourceSkills, targetSkills, { recursive: true });
    log.info({ projectRoot }, "Copied .claude/skills/ to project");
  }

  // Initialize git repo
  const gitDir = resolve(projectRoot, ".git");
  if (!existsSync(gitDir)) {
    try {
      execSync("git init", { cwd: projectRoot, stdio: "ignore" });
      execSync("git add -A", { cwd: projectRoot, stdio: "ignore" });
      execSync('git commit -m "init: project scaffold"', {
        cwd: projectRoot,
        stdio: "ignore",
      });
      log.info({ projectRoot }, "Initialized git repo");
    } catch (err) {
      log.warn({ projectRoot, err }, "git init failed");
    }
  }
}
