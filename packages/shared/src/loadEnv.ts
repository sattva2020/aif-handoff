import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { config as dotenvConfig } from "dotenv";
import { findMonorepoRootFromUrl } from "./monorepoRoot.js";

const MONOREPO_ROOT = findMonorepoRootFromUrl(import.meta.url);
const ROOT_ENV_PATH = resolve(MONOREPO_ROOT, ".env");
const ROOT_ENV_LOCAL_PATH = resolve(MONOREPO_ROOT, ".env.local");

let envLoaded = false;

/**
 * Load root-level .env files once for all Node packages.
 * .env is loaded first, then .env.local overrides it when present.
 */
export function ensureRootEnvLoaded(): void {
  if (envLoaded) return;

  if (existsSync(ROOT_ENV_PATH)) {
    dotenvConfig({ path: ROOT_ENV_PATH });
  }
  if (existsSync(ROOT_ENV_LOCAL_PATH)) {
    dotenvConfig({ path: ROOT_ENV_LOCAL_PATH, override: true });
  }

  envLoaded = true;
}

ensureRootEnvLoaded();
