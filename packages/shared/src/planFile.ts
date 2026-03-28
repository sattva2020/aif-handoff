import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

interface CanonicalPlanInput {
  projectRoot: string;
  isFix: boolean;
}

interface SyncCanonicalPlanInput extends CanonicalPlanInput {
  planText: string | null;
}

export function getCanonicalPlanPath(input: CanonicalPlanInput): string {
  return resolve(
    input.projectRoot,
    input.isFix ? ".ai-factory/FIX_PLAN.md" : ".ai-factory/PLAN.md",
  );
}

export function syncPlanTextToCanonicalFile(input: SyncCanonicalPlanInput): string {
  const canonicalPath = getCanonicalPlanPath(input);
  mkdirSync(dirname(canonicalPath), { recursive: true });
  const normalized = (input.planText ?? "").trimEnd();
  writeFileSync(canonicalPath, `${normalized}\n`, "utf8");
  return canonicalPath;
}
