import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchZaiClaudeQuotaSnapshot } from "../adapters/claude/zaiQuota.js";

const originalFetch = global.fetch;

describe("fetchZaiClaudeQuotaSnapshot", () => {
  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("normalizes Z.AI quota payloads into exact runtime-limit snapshots", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        code: 200,
        success: true,
        data: {
          level: "pro",
          limits: [
            {
              type: "TIME_LIMIT",
              usage: 1000,
              currentValue: 125,
              remaining: 875,
              percentage: 12.5,
              nextResetTime: 1_800_000_000_000,
              usageDetails: [{ modelCode: "web-reader", usage: 12 }],
            },
            {
              type: "TOKENS_LIMIT",
              percentage: 4,
            },
          ],
        },
      }),
    }) as typeof fetch;

    const snapshot = await fetchZaiClaudeQuotaSnapshot({
      runtimeId: "claude",
      providerId: "anthropic",
      profileId: "profile-zai",
      authToken: "secret-token",
      identity: {
        providerFamily: "zai-glm-coding",
        providerLabel: "Z.AI GLM Coding Plan",
        quotaSource: "zai_monitor",
        baseUrl: "https://api.z.ai/api/anthropic",
        baseOrigin: "https://api.z.ai",
        apiKeyEnvVar: "ANTHROPIC_AUTH_TOKEN",
        accountFingerprint: "glm-account-1",
        accountLabel: null,
      },
      checkedAt: "2026-04-18T10:00:00.000Z",
    });

    expect(snapshot).toMatchObject({
      source: "provider_api",
      status: "ok",
      precision: "exact",
      checkedAt: "2026-04-18T10:00:00.000Z",
      providerId: "anthropic",
      runtimeId: "claude",
      profileId: "profile-zai",
      primaryScope: "tool_usage",
      providerMeta: {
        providerFamily: "zai-glm-coding",
        providerLabel: "Z.AI GLM Coding Plan",
        quotaSource: "zai_monitor",
        accountFingerprint: "glm-account-1",
        planType: "pro",
      },
    });
    expect(snapshot?.windows).toEqual([
      expect.objectContaining({
        scope: "tool_usage",
        name: "MCP",
        used: 125,
        remaining: 875,
        limit: 1000,
        percentUsed: 12.5,
        percentRemaining: 87.5,
        resetAt: new Date(1_800_000_000_000).toISOString(),
      }),
      expect.objectContaining({
        scope: "tokens",
        name: "5h",
        percentUsed: 4,
        percentRemaining: 96,
      }),
    ]);
  });

  it("returns null for non-Z.AI provider families", async () => {
    const snapshot = await fetchZaiClaudeQuotaSnapshot({
      runtimeId: "claude",
      providerId: "anthropic",
      authToken: "secret-token",
      identity: {
        providerFamily: "anthropic-native",
        providerLabel: "Anthropic",
        quotaSource: "sdk_event",
        baseUrl: null,
        baseOrigin: "https://api.anthropic.com",
        apiKeyEnvVar: "ANTHROPIC_API_KEY",
        accountFingerprint: null,
        accountLabel: null,
      },
    });

    expect(snapshot).toBeNull();
  });
});
