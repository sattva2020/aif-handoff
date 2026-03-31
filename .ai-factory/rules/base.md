# Project Base Rules

> Auto-detected conventions from codebase analysis. Edit as needed.

## Naming Conventions

- Files: PascalCase for React components (`ChatPanel.tsx`), camelCase for utilities/hooks (`useChat.ts`, `errorClassifier.ts`)
- Variables/Functions: camelCase (`findTaskById`, `executeSubagentQuery`)
- Constants: UPPER_SNAKE_CASE (`TASK_STATUSES`, `EXTERNAL_FAILURE_PATTERNS`)
- Types/Interfaces: PascalCase with descriptive suffixes (`ChatPanelProps`, `CreateProjectInput`, `ErrorRecovery`)
- Explicit `type` keyword for type exports (`export type TaskStatus`)

## Module Structure

- Monorepo with strict package boundaries: `web -> shared/browser`, `api -> data -> shared`, `agent -> data -> shared`
- `@aif/shared` has dual exports: `@aif/shared` (common), `@aif/shared/browser` (browser-safe), `@aif/shared/server` (server-only)
- `@aif/data` is the sole data-access layer — `api` and `agent` never touch DB directly
- Barrel exports in `index.ts` grouped by category (Schema, Types, Database, Logger, Utilities)

## Import Style

- ESM throughout (`"type": "module"` in all package.json)
- Explicit `.js` extensions on relative imports (`from "./schema.js"`)
- Workspace aliases for cross-package imports (`from "@aif/shared"`, `from "@aif/data"`)
- Web package uses `@/*` path alias for local imports (`from "@/hooks/useChat"`)

## Error Handling

- Pattern-matching functions over custom Error classes (`isExternalFailure()`, `isFastRetryableFailure()`)
- Discriminated unions for recovery strategies (`ErrorRecovery = { kind: "fast_retry" } | ...`)
- Minimal try-catch at service boundaries only
- HTTP errors as plain JSON objects (`c.json({ error: "Not found" }, 404)`)

## Logging

- Pino via centralized factory: `const log = logger("component-name")`
- Component-scoped loggers in every module
- Structured context objects: `log.info({ taskId, title }, "message")`
- LOG_LEVEL configurable via environment variable

## Testing

- Framework: Vitest + @testing-library/react
- Test location: `__tests__/` directories adjacent to source
- Mock pattern: `vi.mock()` with `importOriginal` for partial mocks
- Database tests use `createTestDb()` helper with per-test setup via `beforeEach`
- Coverage threshold: 70% per package (@vitest/coverage-v8)
