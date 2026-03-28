# Architecture: Modular Monolith

## Overview

AIF Handoff uses a Modular Monolith architecture implemented via Turborepo workspaces. Each package (`shared`, `api`, `web`, `agent`) is an independent module with its own build, tests, and dependencies — but they deploy and run together as a single system.

This architecture was chosen because the project has clear domain boundaries (data layer, API, UI, agent orchestration) that benefit from strong module separation, while the small team and single-system deployment make microservices unnecessary overhead.

## Decision Rationale

- **Project type:** Autonomous task management system with Kanban UI and AI agent pipeline
- **Tech stack:** TypeScript monorepo (Turborepo), Hono API, React frontend, Claude Agent SDK
- **Key factor:** Natural module boundaries already exist via Turborepo workspaces — formalizing the pattern prevents coupling drift

## Folder Structure

```
packages/
├── shared/              # @aif/shared — foundation module (no package dependencies)
│   └── src/
│       ├── schema.ts        # Drizzle ORM table definitions
│       ├── db.ts            # Database connection factory
│       ├── types.ts         # Shared TypeScript types & interfaces
│       ├── stateMachine.ts  # Task stage transition rules
│       ├── constants.ts     # Application constants
│       ├── env.ts           # Environment config validation (zod)
│       ├── logger.ts        # Pino logger factory
│       ├── index.ts         # Public API (Node.js)
│       └── browser.ts       # Public API (browser-safe subset)
│
├── api/                 # @aif/api — HTTP + WebSocket server module
│   └── src/
│       ├── index.ts         # Server bootstrap (Hono + node-server)
│       ├── routes/          # Route handlers (tasks.ts, projects.ts)
│       ├── middleware/      # Hono middleware (logger.ts)
│       ├── schemas.ts       # Request validation schemas (zod)
│       └── ws.ts            # WebSocket event handler
│
├── web/                 # @aif/web — React SPA module
│   └── src/
│       ├── App.tsx          # Root component
│       ├── components/
│       │   ├── kanban/      # Board, Column, TaskCard, AddTaskForm
│       │   ├── task/        # TaskDetail, TaskPlan, TaskLog, AgentTimeline
│       │   ├── layout/      # Header, CommandPalette
│       │   ├── project/     # ProjectSelector
│       │   └── ui/          # Reusable primitives (button, dialog, badge, etc.)
│       ├── hooks/           # React hooks (useTasks, useWebSocket, useTheme, etc.)
│       └── lib/             # Utilities (api.ts, notifications.ts, utils.ts)
│
└── agent/               # @aif/agent — Agent orchestration module
    └── src/
        ├── index.ts         # Agent bootstrap
        ├── coordinator.ts   # Polling loop (node-cron, 30s interval)
        ├── hooks.ts         # Agent lifecycle hooks
        ├── notifier.ts      # Notification dispatch
        ├── claudeDiagnostics.ts  # Agent SDK health checks
        └── subagents/       # Subagent launchers (planner, implementer, reviewer)
```

## Dependency Rules

Module dependency graph (arrows = "depends on"):

```
web ──→ shared (browser export)
api ──→ shared
agent ──→ shared
```

### Allowed

- ✅ `api`, `web`, `agent` → import from `@aif/shared`
- ✅ `web` → import from `@aif/shared/browser` (browser-safe subset)
- ✅ `web` → call `api` via HTTP/WebSocket at runtime (not import)
- ✅ `agent` → call `api` via HTTP at runtime for broadcasts (see deviation note in point 4)
- ✅ `agent` → direct DB access via `@aif/shared` for pipeline orchestration (intentional deviation)

### Forbidden

- ❌ `shared` → import from `api`, `web`, or `agent` (shared is the foundation, no upward deps)
- ❌ `api` → import from `web` or `agent` (API is independent)
- ❌ `web` → import from `api` or `agent` (UI communicates via HTTP/WS only)
- ❌ `agent` → import from `api` or `web` (agent runtime integration is via HTTP + shared DB, not code imports)
- ❌ Cross-package deep imports (e.g., `@aif/shared/src/db` — use public API only)

## Module Communication

- **web ↔ api:** HTTP REST calls + WebSocket for real-time updates
- **agent → shared (DB):** Direct database access for pipeline orchestration (heartbeats, status transitions, stale recovery)
- **agent → api:** HTTP REST calls for WebSocket broadcasts (best-effort via notifier.ts)
- **agent → Claude Agent SDK:** Spawns subagent processes using `.claude/agents/` definitions
- **Shared types:** All modules import types and schemas from `@aif/shared`

## Key Principles

1. **Public API via exports** — Each package exposes its API through `exports` in `package.json`. Never import internal files directly. `shared` has two entry points: `index.ts` (Node) and `browser.ts` (browser-safe).

2. **Shared is pure foundation** — The `shared` package contains only types, schemas, validation, and utilities. It has zero knowledge of HTTP, React, or agent logic. If code needs framework-specific features, it belongs in the consuming module.

3. **Runtime communication over imports** — Modules that need to interact at runtime (web→api, agent→api) do so via HTTP/WebSocket, never via direct imports. Agent internal orchestration data access remains in `@aif/shared` by design for now.

4. **Single source of truth for data** — Database access lives exclusively in `shared` (schema + connection). The `api` module is the primary read/write interface for external clients. `web` always goes through the API via HTTP/WebSocket.

   > **Intentional deviation (agent):** The `agent` package currently accesses the database directly via `@aif/shared` for performance-critical operations: heartbeat updates (every 30s), status transitions during pipeline execution, and stale task recovery. Routing these through HTTP would add latency and failure points on the critical path. The `notifier.ts` module does call the API via HTTP for WebSocket broadcasts (best-effort). When the agent moves to a separate process or host, these direct DB calls should migrate to API endpoints with proper auth.

5. **Agent definitions are config, not code** — Subagent behavior is defined in `.claude/agents/*.md` files, loaded by the Agent SDK via `settingSources: ["project"]`. The `agent` package orchestrates when to invoke them, not what they do.

6. **Code quality principles are mandatory** — All modules must follow SOLID and DRY principles to keep responsibilities clear, reduce duplication, and preserve maintainability as the monorepo grows.

## Code Examples

### Importing from shared (correct)

```typescript
// In packages/api/src/routes/tasks.ts
import { tasks, TaskStatus } from "@aif/shared";
import { db } from "@aif/shared";

// In packages/web/src/hooks/useTasks.ts
import { TaskStatus, type Task } from "@aif/shared/browser";
```

### Adding a new API route

```typescript
// packages/api/src/routes/newFeature.ts
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "@aif/shared";

const app = new Hono();

app.get("/", async (c) => {
  // Query using drizzle-orm
  const results = await db.select().from(someTable);
  return c.json(results);
});

export default app;
```

### Agent subagent launcher pattern

```typescript
// packages/agent/src/subagents/planner.ts
import { claude } from "@anthropic-ai/claude-agent-sdk";

export async function runPlanner(taskId: string, description: string) {
  const session = await claude({
    agent: "plan-coordinator", // references .claude/agents/plan-coordinator.md
    settingSources: ["project"],
    prompt: `Plan implementation for task ${taskId}: ${description}`,
  });
  return session;
}
```

### Web calling API (correct runtime communication)

```typescript
// packages/web/src/lib/api.ts
const API_BASE = "http://localhost:3001";

export async function fetchTasks(projectId: string) {
  const res = await fetch(`${API_BASE}/api/tasks?projectId=${projectId}`);
  return res.json();
}
```

## Anti-Patterns

- ❌ **Importing across sibling packages** — Never `import { something } from "@aif/api"` inside `@aif/web`. Use HTTP calls instead.
- ❌ **Putting DB queries in api routes directly** — Keep data access in shared or use repository functions. Routes should be thin.
- ❌ **Shared depending on Node-only APIs without a browser guard** — `shared/browser.ts` must remain browser-safe. Node-only code stays in `shared/index.ts`.
- ❌ **Hardcoding agent prompts in TypeScript** — Agent behavior belongs in `.claude/agents/*.md` files, not in the `agent` package source code.
- ❌ **Introducing new external clients with direct DB writes** — `web` and any third-party integrations must go through API endpoints. Current direct DB writes are limited to the co-deployed `agent` service and should not expand to new client surfaces.
