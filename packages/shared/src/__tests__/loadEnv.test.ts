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

  it("loads root .env and .env.local once in order", async () => {
    existsSyncMock.mockImplementation(
      (path) => path.endsWith(".env") || path.endsWith(".env.local"),
    );
    const { ensureRootEnvLoaded } = await import("../loadEnv.js");

    expect(dotenvConfigMock).toHaveBeenNthCalledWith(1, { path: "/repo-root/.env" });
    expect(dotenvConfigMock).toHaveBeenNthCalledWith(2, {
      path: "/repo-root/.env.local",
      override: true,
    });

    ensureRootEnvLoaded();
    expect(dotenvConfigMock).toHaveBeenCalledTimes(2);
  });

  it("skips dotenv loading when root env files are missing", async () => {
    existsSyncMock.mockReturnValue(false);
    await import("../loadEnv.js");

    expect(dotenvConfigMock).not.toHaveBeenCalled();
  });
});
