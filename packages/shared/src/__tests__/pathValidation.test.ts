import { describe, it, expect } from "vitest";
import { validateProjectRootPath } from "../pathValidation.js";

describe("validateProjectRootPath", () => {
  it("accepts valid absolute path", () => {
    expect(validateProjectRootPath("/Users/dev/project")).toBeNull();
  });

  it("accepts path with spaces", () => {
    expect(validateProjectRootPath("/Users/dev/my project")).toBeNull();
  });

  it("rejects empty string", () => {
    expect(validateProjectRootPath("")).not.toBeNull();
  });

  it("rejects relative path", () => {
    expect(validateProjectRootPath("./relative/path")).not.toBeNull();
  });

  it("rejects path with shell metacharacters", () => {
    expect(validateProjectRootPath("/tmp/test;rm -rf /")).not.toBeNull();
    expect(validateProjectRootPath("/tmp/test|cat /etc/passwd")).not.toBeNull();
    expect(validateProjectRootPath("/tmp/test$(whoami)")).not.toBeNull();
    expect(validateProjectRootPath("/tmp/test`id`")).not.toBeNull();
  });

  it("rejects path with null bytes", () => {
    expect(validateProjectRootPath("/tmp/test\0evil")).not.toBeNull();
  });

  it("rejects system directories", () => {
    expect(validateProjectRootPath("/etc")).not.toBeNull();
    expect(validateProjectRootPath("/etc/nginx")).not.toBeNull();
    expect(validateProjectRootPath("/usr")).not.toBeNull();
    expect(validateProjectRootPath("/bin")).not.toBeNull();
    expect(validateProjectRootPath("/var/log")).not.toBeNull();
  });

  it("allows non-system directories", () => {
    expect(validateProjectRootPath("/home/user/projects")).toBeNull();
    expect(validateProjectRootPath("/tmp/workspace")).toBeNull();
    expect(validateProjectRootPath("/opt/app")).toBeNull();
  });
});
