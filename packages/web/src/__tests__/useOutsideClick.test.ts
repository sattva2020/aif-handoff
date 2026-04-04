import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useOutsideClick } from "@/hooks/useOutsideClick";

function makeRef(el: HTMLElement | null = null) {
  return { current: el };
}

describe("useOutsideClick", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it("calls handler on pointerdown outside ref element", () => {
    const handler = vi.fn();
    renderHook(() => useOutsideClick(makeRef(container), handler, true));

    const outside = new PointerEvent("pointerdown", { bubbles: true });
    document.body.dispatchEvent(outside);

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("does not call handler on pointerdown inside ref element", () => {
    const handler = vi.fn();
    renderHook(() => useOutsideClick(makeRef(container), handler, true));

    const inside = new PointerEvent("pointerdown", { bubbles: true });
    container.dispatchEvent(inside);

    expect(handler).not.toHaveBeenCalled();
  });

  it("calls handler on Escape key", () => {
    const handler = vi.fn();
    renderHook(() => useOutsideClick(makeRef(container), handler, true));

    const esc = new KeyboardEvent("keydown", { key: "Escape", bubbles: true });
    document.dispatchEvent(esc);

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("does not call handler on non-Escape key", () => {
    const handler = vi.fn();
    renderHook(() => useOutsideClick(makeRef(container), handler, true));

    const key = new KeyboardEvent("keydown", { key: "Enter", bubbles: true });
    document.dispatchEvent(key);

    expect(handler).not.toHaveBeenCalled();
  });

  it("does nothing when enabled is false", () => {
    const handler = vi.fn();
    renderHook(() => useOutsideClick(makeRef(container), handler, false));

    document.body.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));

    expect(handler).not.toHaveBeenCalled();
  });

  it("cleans up listeners on unmount", () => {
    const handler = vi.fn();
    const { unmount } = renderHook(() => useOutsideClick(makeRef(container), handler, true));

    unmount();

    document.body.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));

    expect(handler).not.toHaveBeenCalled();
  });
});
