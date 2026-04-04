import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FilterButton } from "@/components/ui/filter-button";

describe("FilterButton", () => {
  it("renders children text", () => {
    render(
      <FilterButton active={false} onClick={vi.fn()}>
        All
      </FilterButton>,
    );
    expect(screen.getByText("All")).toBeDefined();
  });

  it("applies active styling when active", () => {
    render(
      <FilterButton active={true} onClick={vi.fn()}>
        Active
      </FilterButton>,
    );
    const button = screen.getByText("Active");
    expect(button.className).toContain("bg-primary/15");
    expect(button.className).toContain("text-primary");
    expect(button.className).toContain("border-primary/45");
  });

  it("applies inactive styling when not active", () => {
    render(
      <FilterButton active={false} onClick={vi.fn()}>
        Inactive
      </FilterButton>,
    );
    const button = screen.getByText("Inactive");
    expect(button.className).toContain("bg-background/45");
    expect(button.className).toContain("text-muted-foreground");
    expect(button.className).toContain("border-border");
  });

  it("fires onClick when clicked", () => {
    const onClick = vi.fn();
    render(
      <FilterButton active={false} onClick={onClick}>
        Click me
      </FilterButton>,
    );
    fireEvent.click(screen.getByText("Click me"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("renders sm size variant", () => {
    render(
      <FilterButton active={false} onClick={vi.fn()} size="sm">
        Small
      </FilterButton>,
    );
    const button = screen.getByText("Small");
    expect(button.className).toContain("py-0.5");
    expect(button.className).toContain("text-3xs");
  });

  it("renders default size variant", () => {
    render(
      <FilterButton active={false} onClick={vi.fn()} size="default">
        Default
      </FilterButton>,
    );
    const button = screen.getByText("Default");
    expect(button.className).toContain("py-1");
    expect(button.className).toContain("text-2xs");
  });

  it("merges custom className", () => {
    render(
      <FilterButton active={false} onClick={vi.fn()} className="ml-4">
        Custom
      </FilterButton>,
    );
    const button = screen.getByText("Custom");
    expect(button.className).toContain("ml-4");
  });
});
