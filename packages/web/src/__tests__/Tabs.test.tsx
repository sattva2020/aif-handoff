import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Tabs } from "@/components/ui/tabs";

const items = [
  { value: "impl", label: "Implementation" },
  { value: "review", label: "Review" },
  { value: "comments", label: "Comments" },
];

describe("Tabs", () => {
  it("renders all tab items", () => {
    render(<Tabs items={items} value="impl" onValueChange={vi.fn()} />);
    expect(screen.getByText("Implementation")).toBeDefined();
    expect(screen.getByText("Review")).toBeDefined();
    expect(screen.getByText("Comments")).toBeDefined();
  });

  it("highlights active tab with primary styling", () => {
    render(<Tabs items={items} value="impl" onValueChange={vi.fn()} />);
    const activeTab = screen.getByText("Implementation");
    expect(activeTab.className).toContain("bg-primary/15");
    expect(activeTab.className).toContain("text-primary");
    expect(activeTab.className).toContain("border-primary/45");
  });

  it("applies inactive styling to non-active tabs", () => {
    render(<Tabs items={items} value="impl" onValueChange={vi.fn()} />);
    const inactiveTab = screen.getByText("Review");
    expect(inactiveTab.className).toContain("text-muted-foreground");
    expect(inactiveTab.className).toContain("border-border/40");
  });

  it("fires onValueChange with clicked tab value", () => {
    const onValueChange = vi.fn();
    render(<Tabs items={items} value="impl" onValueChange={onValueChange} />);
    fireEvent.click(screen.getByText("Review"));
    expect(onValueChange).toHaveBeenCalledWith("review");
  });

  it("renders tablist role on container", () => {
    render(<Tabs items={items} value="impl" onValueChange={vi.fn()} />);
    const tablist = screen.getByRole("tablist");
    expect(tablist).toBeDefined();
  });

  it("sets role=tab on each button", () => {
    render(<Tabs items={items} value="impl" onValueChange={vi.fn()} />);
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(3);
  });

  it("sets aria-selected on active tab only", () => {
    render(<Tabs items={items} value="review" onValueChange={vi.fn()} />);
    const tabs = screen.getAllByRole("tab");
    const selected = tabs.map((tab) => tab.getAttribute("aria-selected"));
    expect(selected).toEqual(["false", "true", "false"]);
  });
});
