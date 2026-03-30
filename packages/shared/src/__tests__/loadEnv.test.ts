import { beforeEach, describe, expect, it, vi } from "vitest";

const existsSyncMock = vi.fn<(path: string) => boolean>();
const dotenvConfigMock = vi.fn<(options: { path: string; override?: boolean }) => void>();
const findMonorepoRootFromUrlMock = vi.fn<(url: string) => string>();

vi.mock("node:fs", () => ({
  existsSync: existsSyncMock,
}));

vi.mock("dotenv", () => ({
  config: dotenvConfigMock,
}));

vi.mock("../monorepoRoot.js", () => ({
  findMonorepoRootFromUrl: findMonorepoRootFromUrlMock,
}));

describe("loadEnv", () => {
  beforeEach(() => {
    vi.resetModules();
    existsSyncMock.mockReset();
    dotenvConfigMock.mockReset();
    findMonorepoRootFromUrlMock.mockReset();
    findMonorepoRootFromUrlMock.mockReturnValue("/repo-root");
  });

  it("skips dotenv loading in test environment (VITEST is set)", async () => {
    // VITEST env var is always set by vitest runner, so loadEnv skips loading
    existsSyncMock.mockReturnValue(true);
    await import("../loadEnv.js");

    expect(dotenvConfigMock).not.toHaveBeenCalled();
  });

  it("skips dotenv loading when root env files are missing", async () => {
    existsSyncMock.mockReturnValue(false);
    await import("../loadEnv.js");

    expect(dotenvConfigMock).not.toHaveBeenCalled();
  });
});
