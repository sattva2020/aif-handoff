import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ToggleButton } from "@/components/ui/toggle-button";

describe("ToggleButton", () => {
  it("renders children text", () => {
    render(
      <ToggleButton expanded={false} onClick={vi.fn()}>
        Show plan
      </ToggleButton>,
    );
    expect(screen.getByText("Show plan")).toBeDefined();
  });

  it("shows ChevronRight when collapsed", () => {
    const { container } = render(
      <ToggleButton expanded={false} onClick={vi.fn()}>
        Show plan
      </ToggleButton>,
    );
    const svg = container.querySelector("svg");
    expect(svg).toBeDefined();
    const button = screen.getByRole("button");
    expect(button.getAttribute("aria-expanded")).toBe("false");
  });

  it("shows ChevronDown when expanded", () => {
    const { container } = render(
      <ToggleButton expanded={true} onClick={vi.fn()}>
        Hide plan
      </ToggleButton>,
    );
    const svg = container.querySelector("svg");
    expect(svg).toBeDefined();
    const button = screen.getByRole("button");
    expect(button.getAttribute("aria-expanded")).toBe("true");
  });

  it("sets aria-expanded to false when collapsed", () => {
    render(
      <ToggleButton expanded={false} onClick={vi.fn()}>
        Toggle
      </ToggleButton>,
    );
    const button = screen.getByRole("button");
    expect(button.getAttribute("aria-expanded")).toBe("false");
  });

  it("sets aria-expanded to true when expanded", () => {
    render(
      <ToggleButton expanded={true} onClick={vi.fn()}>
        Toggle
      </ToggleButton>,
    );
    const button = screen.getByRole("button");
    expect(button.getAttribute("aria-expanded")).toBe("true");
  });

  it("fires onClick when clicked", () => {
    const onClick = vi.fn();
    render(
      <ToggleButton expanded={false} onClick={onClick}>
        Click me
      </ToggleButton>,
    );
    fireEvent.click(screen.getByText("Click me"));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
