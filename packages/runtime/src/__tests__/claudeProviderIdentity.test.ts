import { describe, expect, it } from "vitest";
import {
  ClaudeProviderFamily,
  resolveClaudeProviderIdentity,
} from "../adapters/claude/providerIdentity.js";

describe("resolveClaudeProviderIdentity", () => {
  it("classifies Z.AI anthropic-compatible endpoints as coding-plan backends", async () => {
    const identity = await resolveClaudeProviderIdentity({
      providerId: "anthropic",
      transport: "api",
      baseUrl: "https://api.z.ai/api/anthropic",
      apiKey: "zai-secret-token",
    });

    expect(identity).toMatchObject({
      providerFamily: ClaudeProviderFamily.ZAI_GLM_CODING,
      providerLabel: "Z.AI GLM Coding Plan",
      quotaSource: "zai_monitor",
      baseOrigin: "https://api.z.ai",
    });
    expect(identity.accountFingerprint).toHaveLength(16);
  });

  it("classifies Alibaba coding-plan anthropic endpoints separately", async () => {
    const identity = await resolveClaudeProviderIdentity({
      providerId: "anthropic",
      transport: "api",
      baseUrl: "https://coding.dashscope.aliyuncs.com/apps/anthropic",
      apiKey: "sk-sp-aliyun-coding-plan",
    });

    expect(identity).toMatchObject({
      providerFamily: ClaudeProviderFamily.ALIYUN_CODING_PLAN_ANTHROPIC,
      providerLabel: "Alibaba Coding Plan",
      quotaSource: "none",
      baseOrigin: "https://coding.dashscope.aliyuncs.com",
    });
    expect(identity.accountFingerprint).toHaveLength(16);
  });

  it("treats explicit Anthropic endpoints as native Anthropic", async () => {
    const identity = await resolveClaudeProviderIdentity({
      providerId: "anthropic",
      transport: "api",
      baseUrl: "https://api.anthropic.com/v1/messages",
      apiKey: "anthropic-native-key",
    });

    expect(identity).toMatchObject({
      providerFamily: ClaudeProviderFamily.ANTHROPIC_NATIVE,
      providerLabel: "Anthropic",
      quotaSource: "headers",
      baseOrigin: "https://api.anthropic.com",
    });
    expect(identity.accountFingerprint).toHaveLength(16);
  });
});
