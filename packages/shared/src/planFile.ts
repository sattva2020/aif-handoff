import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { getProjectConfig } from "./projectConfig.js";

interface CanonicalPlanInput {
  projectRoot: string;
  isFix: boolean;
  planPath?: string;
}

interface SyncCanonicalPlanInput extends CanonicalPlanInput {
  planText: string | null;
}

export function getCanonicalPlanPath(input: CanonicalPlanInput): string {
  const cfg = getProjectConfig(input.projectRoot);
  if (input.isFix) {
    return resolve(input.projectRoot, cfg.paths.fix_plan);
  }
  return resolve(input.projectRoot, input.planPath || cfg.paths.plan);
}

export function syncPlanTextToCanonicalFile(input: SyncCanonicalPlanInput): string {
  const canonicalPath = getCanonicalPlanPath(input);
  mkdirSync(dirname(canonicalPath), { recursive: true });
  const normalized = (input.planText ?? "").trimEnd();
  writeFileSync(canonicalPath, `${normalized}\n`, "utf8");
  return canonicalPath;
}
