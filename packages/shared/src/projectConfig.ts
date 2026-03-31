import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import YAML from "yaml";

export interface AifProjectPaths {
  plan: string;
  plans: string;
  fix_plan: string;
  roadmap: string;
  description: string;
  architecture: string;
  docs: string;
  research: string;
  rules_file: string;
  security: string;
  references: string;
  patches: string;
  evolutions: string;
  evolution: string;
  specs: string;
  rules: string;
}

export interface AifProjectWorkflow {
  auto_create_dirs: boolean;
  plan_id_format: "slug" | "timestamp" | "uuid";
  analyze_updates_architecture: boolean;
  architecture_updates_roadmap: boolean;
  verify_mode: "strict" | "normal" | "lenient";
}

export interface AifProjectConfig {
  paths: AifProjectPaths;
  workflow: AifProjectWorkflow;
}

const DEFAULT_PATHS: AifProjectPaths = {
  plan: ".ai-factory/PLAN.md",
  plans: ".ai-factory/plans/",
  fix_plan: ".ai-factory/FIX_PLAN.md",
  roadmap: ".ai-factory/ROADMAP.md",
  description: ".ai-factory/DESCRIPTION.md",
  architecture: ".ai-factory/ARCHITECTURE.md",
  docs: "docs/",
  research: ".ai-factory/RESEARCH.md",
  rules_file: ".ai-factory/RULES.md",
  security: ".ai-factory/SECURITY.md",
  references: ".ai-factory/references/",
  patches: ".ai-factory/patches/",
  evolutions: ".ai-factory/evolutions/",
  evolution: ".ai-factory/evolution/",
  specs: ".ai-factory/specs/",
  rules: ".ai-factory/rules/",
};

const DEFAULT_WORKFLOW: AifProjectWorkflow = {
  auto_create_dirs: true,
  plan_id_format: "slug",
  analyze_updates_architecture: true,
  architecture_updates_roadmap: true,
  verify_mode: "normal",
};

/** Cached configs keyed by projectRoot to avoid re-reading on every call */
const configCache = new Map<string, { config: AifProjectConfig; mtimeMs: number }>();

/**
 * Load resolved config for a project.
 * If `.ai-factory/config.yaml` exists, its values override defaults.
 * Results are cached per projectRoot and invalidated when mtime changes.
 */
export function getProjectConfig(projectRoot: string): AifProjectConfig {
  const configPath = join(projectRoot, ".ai-factory", "config.yaml");

  if (!existsSync(configPath)) {
    return { paths: { ...DEFAULT_PATHS }, workflow: { ...DEFAULT_WORKFLOW } };
  }

  const stat = statSync(configPath);
  const cached = configCache.get(projectRoot);
  if (cached && cached.mtimeMs === stat.mtimeMs) {
    return cached.config;
  }

  const raw = readFileSync(configPath, "utf-8");
  const parsed = YAML.parse(raw) as Record<string, unknown> | null;

  const yamlPaths = (parsed?.paths ?? {}) as Partial<AifProjectPaths>;
  const yamlWorkflow = (parsed?.workflow ?? {}) as Partial<AifProjectWorkflow>;

  const config: AifProjectConfig = {
    paths: { ...DEFAULT_PATHS, ...yamlPaths },
    workflow: { ...DEFAULT_WORKFLOW, ...yamlWorkflow },
  };

  configCache.set(projectRoot, { config, mtimeMs: stat.mtimeMs });
  return config;
}

/** Clear the cached config for a project (useful after writing config.yaml) */
export function clearProjectConfigCache(projectRoot?: string): void {
  if (projectRoot) {
    configCache.delete(projectRoot);
  } else {
    configCache.clear();
  }
}
