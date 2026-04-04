import { describe, it, expect } from "vitest";
import { statusColorStyle, statusHex, kindBadgeStyle } from "@/hooks/useStatusColor";

describe("statusColorStyle", () => {
  it("returns correct inline styles for a known status", () => {
    const style = statusColorStyle("backlog");
    expect(style).toEqual({
      backgroundColor: "#6B728020",
      color: "#6B7280",
      borderColor: "#6B728040",
    });
  });

  it("returns correct inline styles for done status", () => {
    const style = statusColorStyle("done");
    expect(style.color).toBe("#10B981");
  });
});

describe("statusHex", () => {
  it("returns hex color string for status", () => {
    expect(statusHex("implementing")).toBe("#8B5CF6");
  });
});

describe("kindBadgeStyle", () => {
  it("returns TOOL badge for tool kind", () => {
    const badge = kindBadgeStyle("tool");
    expect(badge.label).toBe("TOOL");
    expect(badge.className).toContain("cyan");
  });

  it("returns AGENT badge for agent kind", () => {
    const badge = kindBadgeStyle("agent");
    expect(badge.label).toBe("AGENT");
    expect(badge.className).toContain("violet");
  });

  it("returns ERROR badge for error kind", () => {
    const badge = kindBadgeStyle("error");
    expect(badge.label).toBe("ERROR");
    expect(badge.className).toContain("red");
  });

  it("returns INFO badge for unknown kind", () => {
    const badge = kindBadgeStyle("unknown");
    expect(badge.label).toBe("INFO");
    expect(badge.className).toContain("muted");
  });
});
