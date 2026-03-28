import { afterAll, describe, expect, it } from "vitest";
import { closeDb } from "../db.js";
import { incrementTaskTokenUsage, parseTaskTokenUsage } from "../taskUsage.js";

describe("taskUsage", () => {
  afterAll(() => {
    closeDb();
  });

  it("normalizes snake_case and camelCase usage fields", () => {
    const snake = parseTaskTokenUsage({
      input_tokens: 10,
      output_tokens: 5,
      cache_read_input_tokens: 2,
      cache_creation_input_tokens: 3,
      total_cost_usd: 0.25,
    });
    expect(snake).toEqual({ input: 15, output: 5, total: 20, costUsd: 0.25 });

    const camel = parseTaskTokenUsage({
      inputTokens: 7,
      outputTokens: 4,
      cacheReadInputTokens: 1,
      cacheCreationInputTokens: 2,
      totalCostUsd: 0.1,
    });
    expect(camel).toEqual({ input: 10, output: 4, total: 14, costUsd: 0.1 });
  });

  it("handles invalid values and no-op increments safely", () => {
    const parsed = parseTaskTokenUsage({
      input_tokens: -1,
      output_tokens: Number.NaN,
      cache_read_input_tokens: "oops",
      total_cost_usd: -10,
    });
    expect(parsed).toEqual({ input: 0, output: 0, total: 0, costUsd: 0 });

    const noOp = incrementTaskTokenUsage("missing-task", null);
    expect(noOp).toEqual({ input: 0, output: 0, total: 0, costUsd: 0 });
  });

  it("returns delta for increment payload", () => {
    const delta = incrementTaskTokenUsage("missing-task", {
      input_tokens: 3,
      output_tokens: 2,
      cache_read_input_tokens: 1,
      cache_creation_input_tokens: 0,
      total_cost_usd: 0.01,
    });

    expect(delta).toEqual({ input: 4, output: 2, total: 6, costUsd: 0.01 });
  });
});
