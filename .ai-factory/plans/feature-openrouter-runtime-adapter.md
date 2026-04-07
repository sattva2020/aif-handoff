# Implementation Plan: OpenRouter Runtime Adapter

Branch: feature/openrouter-runtime-adapter
Created: 2026-04-07

## Settings

- Testing: yes
- Logging: verbose
- Docs: yes

## Roadmap Linkage

Milestone: "OpenRouter Runtime Adapter"
Rationale: Расширение поддерживаемых AI-провайдеров — OpenRouter даёт доступ к 200+ моделям через единый API.

## Overview

Добавить built-in OpenRouter runtime adapter в `@aif/runtime`. OpenRouter — это OpenAI-совместимый API-прокси, дающий доступ к моделям Anthropic, OpenAI, Google, Meta и других провайдеров через единый endpoint. Адаптер использует только API transport (HTTP), поддерживает streaming (SSE) и model discovery.

### Ключевые решения

- **Только API transport** — OpenRouter не имеет CLI или SDK, только REST API
- **OpenAI-совместимый формат** — chat completions, SSE streaming, `/models` endpoint
- **Специфичные заголовки** — `HTTP-Referer` и `X-Title` (рекомендуемые OpenRouter)
- **Модели в формате `provider/model`** — напр. `anthropic/claude-sonnet-4`, `openai/gpt-4o`
- **`lightModel: null`** — пользователь настраивает через runtime profile (слишком много вариантов)
- **Default base URL** — `https://openrouter.ai/api/v1` (с возможностью override для self-hosted)

### Capabilities

| Capability | Value | Reason |
|---|---|---|
| supportsResume | false | Stateless API |
| supportsSessionList | false | Stateless API |
| supportsAgentDefinitions | false | Chat completions only |
| supportsStreaming | true | SSE (OpenAI format) |
| supportsModelDiscovery | true | GET /models |
| supportsApprovals | false | No HITL support |
| supportsCustomEndpoint | true | Self-hosted proxy support |

## Commit Plan

- **Commit 1** (after tasks 1-3): "feat(runtime): add OpenRouter adapter with API transport and streaming"
- **Commit 2** (after task 4): "feat(runtime): integrate OpenRouter into resolution and bootstrap"
- **Commit 3** (after task 5): "test(runtime): add OpenRouter adapter test suite"
- **Commit 4** (after task 6): "docs: add OpenRouter adapter documentation and roadmap milestone"

## Tasks

### Phase 1: Foundation

- [x] Task 1: Create OpenRouter error classification
  - File: `packages/runtime/src/adapters/openrouter/errors.ts`
  - Extend `RuntimeExecutionError` with `OpenRouterRuntimeAdapterError`
  - Pattern-matched classifier: rate_limit, auth, timeout, model_not_found, context_length, content_filter, transport_error, fallback
  - Follow codex/errors.ts pattern exactly

- [x] Task 2: Create OpenRouter API transport
  - File: `packages/runtime/src/adapters/openrouter/api.ts`
  - `runOpenRouterApi()` — POST /chat/completions (non-streaming)
  - `runOpenRouterApiStreaming()` — POST /chat/completions with SSE
  - `validateOpenRouterApiConnection()` — GET /models health check
  - `listOpenRouterApiModels()` — GET /models → RuntimeModel[]
  - URL resolution: options.baseUrl → OPENROUTER_BASE_URL → default
  - Auth: OPENROUTER_API_KEY, headers HTTP-Referer + X-Title
  - Usage normalization: prompt_tokens/completion_tokens → inputTokens/outputTokens

### Phase 2: Assembly

- [x] Task 3: Create OpenRouter adapter factory (depends on 1, 2)
  - File: `packages/runtime/src/adapters/openrouter/index.ts`
  - `createOpenRouterRuntimeAdapter(options?)` → RuntimeAdapter
  - Descriptor: id=openrouter, providerId=openrouter, transport=API
  - run() routes to streaming/non-streaming based on input
  - validateConnection(), listModels(), diagnoseError()
  - Built-in fallback models: anthropic/claude-sonnet-4, openai/gpt-4o, google/gemini-2.0-flash-001

- [x] Task 4: Integrate into runtime resolution and bootstrap (depends on 3)
  - Files: `resolution.ts`, `bootstrap.ts`
  - Add OPENROUTER_API_KEY, OPENROUTER_BASE_URL, OPENROUTER_MODEL to RuntimeResolutionEnv
  - Add OpenRouter branches in inferDefaultApiKeyEnvVar, inferDefaultBaseUrl, inferDefaultTransport, inferDefaultModel
  - Register createOpenRouterRuntimeAdapter() in bootstrap.ts builtInAdapters array

### Phase 3: Testing

- [x] Task 5: Write OpenRouter adapter tests (depends on 4)
  - `__tests__/openrouterErrors.test.ts` — error classification
  - `__tests__/openrouterApi.test.ts` — API transport (mock fetch)
  - `__tests__/openrouterAdapter.test.ts` — adapter factory (mock api.ts)
  - Update `__tests__/resolution.test.ts` — OpenRouter env inference cases
  - Update `__tests__/bootstrap.test.ts` — verify registration
  - Target: 70%+ coverage

<!-- Commit checkpoint: tasks 1-5 -->

### Phase 4: Documentation & Config

- [x] Task 6: Update documentation, config, and roadmap (depends on 4)
  - `docs/providers.md` — add Supported Runtimes row + OpenRouter section with profile examples
  - `docs/configuration.md` — add OpenRouter env vars to table + Authentication section entry
  - `.env.example` — add OpenRouter section with OPENROUTER_API_KEY, OPENROUTER_BASE_URL, OPENROUTER_MODEL, OPENROUTER_HTTP_REFERER, OPENROUTER_APP_TITLE
  - `.ai-factory/ROADMAP.md` — add milestone
  - `CLAUDE.md` / `AGENTS.md` — update adapter listing in Project Structure (add `openrouter/` under `adapters/`)

## Environment Variables

| Variable | Purpose | Default |
|---|---|---|
| `OPENROUTER_API_KEY` | API authentication | (required) |
| `OPENROUTER_BASE_URL` | Custom endpoint | `https://openrouter.ai/api/v1` |
| `OPENROUTER_MODEL` | Default model | (none) |
| `OPENROUTER_HTTP_REFERER` | Recommended header for rankings | (empty) |
| `OPENROUTER_APP_TITLE` | Recommended header for rankings | `AIF Handoff` |

## File Structure

```
packages/runtime/src/adapters/openrouter/
  index.ts    — factory: createOpenRouterRuntimeAdapter(options) → RuntimeAdapter
  api.ts      — HTTP transport: chat completions, streaming, model discovery
  errors.ts   — error classification (extend RuntimeExecutionError)

packages/runtime/src/__tests__/
  openrouterErrors.test.ts   — error classifier tests
  openrouterApi.test.ts      — API transport tests (mock fetch)
  openrouterAdapter.test.ts  — adapter factory tests (mock api.ts)
```
