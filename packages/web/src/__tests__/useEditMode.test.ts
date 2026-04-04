import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useEditMode } from "@/hooks/useEditMode";

describe("useEditMode", () => {
  it("starts in non-editing state", () => {
    const { result } = renderHook(() => useEditMode(""));
    expect(result.current.isEditing).toBe(false);
  });

  it("enters editing mode with startEditing", () => {
    const { result } = renderHook(() => useEditMode(""));

    act(() => result.current.startEditing("hello"));

    expect(result.current.isEditing).toBe(true);
    expect(result.current.draft).toBe("hello");
  });

  it("save exits editing and returns draft", () => {
    const { result } = renderHook(() => useEditMode(""));

    act(() => result.current.startEditing("hello"));
    act(() => result.current.setDraft("updated"));

    let saved: string;
    act(() => {
      saved = result.current.save();
    });

    expect(saved!).toBe("updated");
    expect(result.current.isEditing).toBe(false);
  });

  it("cancel resets draft and exits editing", () => {
    const { result } = renderHook(() => useEditMode("initial"));

    act(() => result.current.startEditing("editing"));
    act(() => result.current.setDraft("changed"));
    act(() => result.current.cancel());

    expect(result.current.isEditing).toBe(false);
    expect(result.current.draft).toBe("initial");
  });

  it("setDraft updates draft value", () => {
    const { result } = renderHook(() => useEditMode(""));

    act(() => result.current.startEditing("start"));
    act(() => result.current.setDraft("new value"));

    expect(result.current.draft).toBe("new value");
  });
});
