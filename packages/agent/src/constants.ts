/**
 * Shared constants for the agent package.
 */

export const PROJECT_SCOPE_SYSTEM_APPEND =
  "Project scope rule: work strictly inside the current working directory (project root). " +
  "Do not inspect or modify files in the orchestrator monorepo or in parent/sibling directories " +
  "unless the user explicitly asks for that path. Avoid broad discovery outside the current project root.";
