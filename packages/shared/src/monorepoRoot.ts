import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Walk up from `startPath` to find the nearest directory containing
 * a package.json with `workspaces` (i.e. the monorepo root).
 * Falls back to 3 levels up from startPath.
 */
export function findMonorepoRoot(startPath: string): string {
  let dir = dirname(startPath);

  for (let i = 0; i < 10; i++) {
    const pkgPath = resolve(dir, "package.json");
    if (existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
        if (pkg.workspaces) return dir;
      } catch {
        /* skip malformed package.json */
      }
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  return resolve(dirname(startPath), "../../..");
}

/** Convenience: resolve the monorepo root relative to the calling module's import.meta.url. */
export function findMonorepoRootFromUrl(importMetaUrl: string): string {
  return findMonorepoRoot(fileURLToPath(importMetaUrl));
}
