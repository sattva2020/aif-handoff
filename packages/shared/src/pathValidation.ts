import { resolve, isAbsolute } from "node:path";

const SHELL_META_CHARS = /[;&|`$(){}!<>]/;

/**
 * Validate that a project root path is safe for use with file system and shell operations.
 * Returns null if valid, or an error message if invalid.
 */
export function validateProjectRootPath(rootPath: string): string | null {
  if (!rootPath || rootPath.trim().length === 0) {
    return "rootPath must not be empty";
  }

  if (!isAbsolute(rootPath)) {
    return "rootPath must be an absolute path";
  }

  const resolved = resolve(rootPath);

  if (resolved.includes("\0")) {
    return "rootPath must not contain null bytes";
  }

  if (SHELL_META_CHARS.test(resolved)) {
    return "rootPath must not contain shell metacharacters";
  }

  // Prevent access to system-critical directories
  const blocked = ["/etc", "/usr", "/bin", "/sbin", "/var", "/sys", "/proc", "/dev"];
  for (const dir of blocked) {
    if (resolved === dir || resolved.startsWith(`${dir}/`)) {
      return `rootPath must not point to system directory: ${dir}`;
    }
  }

  return null;
}
