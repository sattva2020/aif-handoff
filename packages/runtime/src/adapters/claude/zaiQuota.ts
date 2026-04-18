import {
  RuntimeLimitPrecision,
  RuntimeLimitScope,
  RuntimeLimitSource,
  RuntimeLimitStatus,
  type RuntimeLimitSnapshot,
  type RuntimeLimitWindow,
} from "../../types.js";
import type { ClaudeProviderIdentity } from "./providerIdentity.js";

interface ZaiQuotaLogger {
  debug?(context: Record<string, unknown>, message: string): void;
  warn?(context: Record<string, unknown>, message: string): void;
}

interface FetchZaiClaudeQuotaSnapshotInput {
  runtimeId: string;
  providerId: string;
  profileId?: string | null;
  identity: ClaudeProviderIdentity;
  authToken: string;
  checkedAt?: string;
  logger?: ZaiQuotaLogger;
}

const WARNING_THRESHOLD = 10;
const MAX_VALID_DATE_MS = 8_640_000_000_000_000;
const ZAI_QUOTA_REQUEST_TIMEOUT_MS = 1_500;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function readFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeTimestamp(value: unknown): string | null {
  const raw = readFiniteNumber(value);
  if (raw == null) return null;

  const targetMs = raw >= 1_000_000_000_000 ? raw : raw * 1000;
  if (!Number.isFinite(targetMs) || Math.abs(targetMs) > MAX_VALID_DATE_MS) {
    return null;
  }

  const date = new Date(targetMs);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function toPercentRemaining(percentUsed: number | null): number | null {
  if (percentUsed == null) return null;
  return Math.max(0, Math.min(100, 100 - percentUsed));
}

function buildWindowFromLimit(limit: Record<string, unknown>): RuntimeLimitWindow | null {
  const limitType = readString(limit.type);
  const percentUsed = readFiniteNumber(limit.percentage);
  const percentRemaining = toPercentRemaining(percentUsed);
  const resetAt = normalizeTimestamp(limit.nextResetTime);
  const remaining = readFiniteNumber(limit.remaining);
  const used = readFiniteNumber(limit.currentValue);
  const total = readFiniteNumber(limit.usage);

  if (limitType === "TOKENS_LIMIT") {
    if (percentUsed == null && percentRemaining == null && resetAt == null) {
      return null;
    }

    return {
      scope: RuntimeLimitScope.TOKENS,
      name: "5h",
      percentUsed,
      percentRemaining,
      resetAt,
      warningThreshold: WARNING_THRESHOLD,
    };
  }

  if (limitType === "TIME_LIMIT") {
    if (
      percentUsed == null &&
      percentRemaining == null &&
      remaining == null &&
      used == null &&
      total == null &&
      resetAt == null
    ) {
      return null;
    }

    return {
      scope: RuntimeLimitScope.TOOL_USAGE,
      name: "MCP",
      used,
      remaining,
      limit: total,
      percentUsed,
      percentRemaining,
      resetAt,
      warningThreshold: WARNING_THRESHOLD,
    };
  }

  return null;
}

function resolveSnapshotStatus(windows: RuntimeLimitWindow[]): RuntimeLimitStatus {
  if (
    windows.some(
      (window) =>
        (typeof window.percentRemaining === "number" && window.percentRemaining <= 0) ||
        (typeof window.remaining === "number" && window.remaining <= 0),
    )
  ) {
    return RuntimeLimitStatus.BLOCKED;
  }

  if (
    windows.some(
      (window) =>
        (typeof window.percentRemaining === "number" &&
          window.percentRemaining <= WARNING_THRESHOLD) ||
        (typeof window.remaining === "number" &&
          typeof window.limit === "number" &&
          window.limit > 0 &&
          window.remaining / window.limit <= WARNING_THRESHOLD / 100),
    )
  ) {
    return RuntimeLimitStatus.WARNING;
  }

  if (windows.length > 0) {
    return RuntimeLimitStatus.OK;
  }

  return RuntimeLimitStatus.UNKNOWN;
}

export async function fetchZaiClaudeQuotaSnapshot(
  input: FetchZaiClaudeQuotaSnapshotInput,
): Promise<RuntimeLimitSnapshot | null> {
  if (input.identity.providerFamily !== "zai-glm-coding" || !input.identity.baseOrigin) {
    return null;
  }

  const url = new URL("/api/monitor/usage/quota/limit", input.identity.baseOrigin);
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), ZAI_QUOTA_REQUEST_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        Authorization: input.authToken,
        "Accept-Language": "en-US,en",
        "Content-Type": "application/json",
      },
      signal: abortController.signal,
    });
  } catch (error) {
    input.logger?.warn?.(
      {
        runtimeId: input.runtimeId,
        providerId: input.providerId,
        profileId: input.profileId ?? null,
        baseOrigin: input.identity.baseOrigin,
        timeoutMs: ZAI_QUOTA_REQUEST_TIMEOUT_MS,
        error: error instanceof Error ? error.message : String(error),
      },
      "Unable to refresh Z.AI coding quota snapshot from provider monitor endpoint",
    );
    return null;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    input.logger?.warn?.(
      {
        runtimeId: input.runtimeId,
        providerId: input.providerId,
        profileId: input.profileId ?? null,
        baseOrigin: input.identity.baseOrigin,
        status: response.status,
      },
      "Unable to refresh Z.AI coding quota snapshot from provider monitor endpoint",
    );
    return null;
  }

  const payload = asRecord(await response.json());
  const data = asRecord(payload?.data) ?? payload;
  const rawLimits = Array.isArray(data?.limits) ? data.limits : [];
  const windows = rawLimits
    .map((limit) => buildWindowFromLimit(asRecord(limit) ?? {}))
    .filter((window): window is RuntimeLimitWindow => window != null);

  if (windows.length === 0) {
    return null;
  }

  const status = resolveSnapshotStatus(windows);
  const resetAt =
    windows.find((window) => typeof window.resetAt === "string" && window.resetAt.length > 0)
      ?.resetAt ?? null;
  const usageDetails =
    rawLimits.map((limit) => asRecord(limit)).find((limit) => Array.isArray(limit?.usageDetails))
      ?.usageDetails ?? null;

  const snapshot: RuntimeLimitSnapshot = {
    source: RuntimeLimitSource.PROVIDER_API,
    status,
    precision: RuntimeLimitPrecision.EXACT,
    checkedAt: input.checkedAt ?? new Date().toISOString(),
    providerId: input.providerId,
    runtimeId: input.runtimeId,
    profileId: input.profileId ?? null,
    primaryScope: windows[0]?.scope ?? RuntimeLimitScope.TOKENS,
    resetAt,
    retryAfterSeconds: null,
    warningThreshold: WARNING_THRESHOLD,
    windows,
    providerMeta: {
      providerFamily: input.identity.providerFamily,
      providerLabel: input.identity.providerLabel,
      quotaSource: input.identity.quotaSource,
      accountFingerprint: input.identity.accountFingerprint,
      accountLabel: input.identity.accountLabel,
      planType: readString(data?.level),
      usageDetails,
    },
  };

  input.logger?.debug?.(
    {
      runtimeId: input.runtimeId,
      providerId: input.providerId,
      profileId: input.profileId ?? null,
      status: snapshot.status,
      windowCount: snapshot.windows.length,
    },
    "Observed Z.AI coding quota snapshot from provider monitor endpoint",
  );

  return snapshot;
}
