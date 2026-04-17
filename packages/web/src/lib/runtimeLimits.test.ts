import { describe, expect, it } from "vitest";
import type { RuntimeLimitSnapshot } from "@aif/shared/browser";
import { getRuntimeLimitDisplay } from "./runtimeLimits";

function createSnapshot(overrides: Partial<RuntimeLimitSnapshot> = {}): RuntimeLimitSnapshot {
  return {
    source: "api_headers",
    status: "blocked",
    precision: "exact",
    checkedAt: "2026-04-17T00:00:00.000Z",
    providerId: "anthropic",
    runtimeId: "claude",
    profileId: "profile-1",
    primaryScope: "requests",
    resetAt: "2026-04-17T01:00:00.000Z",
    warningThreshold: 10,
    windows: [
      {
        scope: "requests",
        percentRemaining: 5,
        warningThreshold: 10,
        resetAt: "2026-04-17T01:00:00.000Z",
      },
    ],
    providerMeta: null,
    ...overrides,
  };
}

describe("getRuntimeLimitDisplay", () => {
  it("keeps an active blocked snapshot blocked before resetAt", () => {
    const display = getRuntimeLimitDisplay(createSnapshot(), {
      nowMs: Date.parse("2026-04-17T00:30:00.000Z"),
    });

    expect(display).toMatchObject({
      state: "active",
      tone: "error",
      isExpired: false,
      label: "Blocked",
      shortLabel: "BLOCKED",
    });
  });

  it("degrades blocked snapshots to expired once resetAt has passed", () => {
    const display = getRuntimeLimitDisplay(createSnapshot(), {
      nowMs: Date.parse("2026-04-17T01:30:00.000Z"),
    });

    expect(display).toMatchObject({
      state: "expired",
      tone: "info",
      isExpired: true,
      label: "Expired",
      shortLabel: "EXPIRED",
    });
    expect(display?.summary).toContain("last runtime limit window has expired");
    expect(display?.resetText).toContain("Reset window elapsed");
  });

  it("degrades warning snapshots to expired once their reset window has passed", () => {
    const display = getRuntimeLimitDisplay(
      createSnapshot({
        status: "warning",
      }),
      {
        nowMs: Date.parse("2026-04-17T01:30:00.000Z"),
      },
    );

    expect(display).toMatchObject({
      state: "expired",
      tone: "info",
      isExpired: true,
      label: "Expired",
      shortLabel: "EXPIRED",
    });
  });

  it("degrades blocked snapshots without an active reset hint to a neutral inactive state", () => {
    const display = getRuntimeLimitDisplay(
      createSnapshot({
        resetAt: null,
        windows: [{ scope: "requests", percentRemaining: 5, warningThreshold: 10, resetAt: null }],
      }),
      {
        nowMs: Date.parse("2026-04-17T00:30:00.000Z"),
      },
    );

    expect(display).toMatchObject({
      state: "stale",
      tone: "info",
      isExpired: false,
      label: "Inactive",
      shortLabel: "INACTIVE",
    });
    expect(display?.summary).toContain("no active reset hint");
    expect(display?.resetText).toBeNull();
  });
});
