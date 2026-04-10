import { describe, expect, it } from "vitest";
import { resolveLogDestination } from "../logger.js";

describe("logger", () => {
  it("defaults to stdout when LOG_DESTINATION is not set", () => {
    expect(resolveLogDestination({})).toBe(1);
  });

  it("routes logs to stderr when LOG_DESTINATION=stderr", () => {
    expect(resolveLogDestination({ LOG_DESTINATION: "stderr" })).toBe(2);
  });

  it("accepts numeric stderr destination values", () => {
    expect(resolveLogDestination({ LOG_DESTINATION: "2" })).toBe(2);
  });
});
