import { describe, expect, it } from "vitest";
import { createClaudeRuntimeAdapter } from "../adapters/claude/index.js";
import { RuntimeTransport } from "../types.js";

describe("Claude adapter validateConnection", () => {
  const adapter = createClaudeRuntimeAdapter();
  const validate = adapter.validateConnection!;

  const base = { runtimeId: "claude", providerId: "anthropic" };

  it("SDK transport passes without API key (session auth)", async () => {
    const result = await validate({
      ...base,
      transport: RuntimeTransport.SDK,
      options: {},
    });
    expect(result.ok).toBe(true);
    expect(result.message).toContain("session auth");
  });

  it("SDK transport passes with API key", async () => {
    const result = await validate({
      ...base,
      transport: RuntimeTransport.SDK,
      options: { apiKey: "sk-test" },
    });
    expect(result.ok).toBe(true);
    expect(result.message).toContain("API key");
  });

  it("SDK transport is the default when transport is omitted", async () => {
    const result = await validate({ ...base, options: {} });
    expect(result.ok).toBe(true);
  });

  it("CLI transport passes without API key", async () => {
    const result = await validate({
      ...base,
      transport: RuntimeTransport.CLI,
      options: {},
    });
    expect(result.ok).toBe(true);
    expect(result.message).toContain("CLI");
  });

  it("API transport fails without API key", async () => {
    const result = await validate({
      ...base,
      transport: RuntimeTransport.API,
      options: { baseUrl: "https://proxy.example.com" },
    });
    expect(result.ok).toBe(false);
    expect(result.message).toContain("Missing API key");
  });

  it("API transport fails without base URL", async () => {
    const result = await validate({
      ...base,
      transport: RuntimeTransport.API,
      options: { apiKey: "sk-test" },
    });
    expect(result.ok).toBe(false);
    expect(result.message).toContain("Missing base URL");
  });

  it("API transport fails with both missing", async () => {
    const result = await validate({
      ...base,
      transport: RuntimeTransport.API,
      options: {},
    });
    expect(result.ok).toBe(false);
    expect(result.message).toContain("Missing API key");
    expect(result.message).toContain("Missing base URL");
  });

  it("API transport passes with key + base URL", async () => {
    const result = await validate({
      ...base,
      transport: RuntimeTransport.API,
      options: { apiKey: "sk-test", baseUrl: "https://proxy.example.com" },
    });
    expect(result.ok).toBe(true);
  });
});
