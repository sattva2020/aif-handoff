import { logger } from "@aif/shared";
import type { ConflictResolution } from "@aif/shared";

const log = logger("mcp:conflict");

export interface ConflictCheckInput {
  sourceTimestamp: string;
  targetTimestamp: string;
  field: string;
}

/**
 * Last-write-wins conflict resolution.
 * Compares source timestamp against target (Handoff task's updatedAt).
 */
export function resolveConflict(input: ConflictCheckInput): ConflictResolution {
  let sourceTime = new Date(input.sourceTimestamp).getTime();
  const targetTime = new Date(input.targetTimestamp).getTime();

  // Guard: if sourceTimestamp is truly invalid (NaN or epoch zero — e.g. a midnight
  // placeholder from an LLM that approximated "now"), fall back to server time.
  // A merely-older-but-valid source timestamp should NOT trigger the fallback;
  // instead the target should win the conflict normally.
  const EPOCH_ZERO = 0;
  if (Number.isNaN(sourceTime) || sourceTime === EPOCH_ZERO) {
    const now = Date.now();
    log.warn(
      { ...input, fallbackNow: new Date(now).toISOString() },
      "sourceTimestamp is invalid (NaN or epoch zero), using server time as fallback",
    );
    sourceTime = now;
  }

  if (sourceTime >= targetTime) {
    log.debug({ ...input, winner: "source" }, "Conflict resolved: source wins");
    return {
      applied: true,
      conflict: false,
      winner: "source",
      sourceTimestamp: input.sourceTimestamp,
      targetTimestamp: input.targetTimestamp,
      field: input.field,
    };
  }

  log.warn({ ...input, winner: "target" }, "Conflict detected: target is newer");
  return {
    applied: false,
    conflict: true,
    winner: "target",
    sourceTimestamp: input.sourceTimestamp,
    targetTimestamp: input.targetTimestamp,
    field: input.field,
  };
}
