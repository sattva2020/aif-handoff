import { useState, useCallback } from "react";

interface UseEditModeReturn<T> {
  isEditing: boolean;
  draft: T;
  setDraft: (value: T) => void;
  /** Enter edit mode, initializing draft from the provided value. */
  startEditing: (value: T) => void;
  /** Save draft and exit edit mode. Returns the draft value. */
  save: () => T;
  /** Discard draft and exit edit mode. */
  cancel: () => void;
}

/**
 * Manages isEditing + draft state for inline editing patterns.
 * @param initialDraft - fallback value for draft when not editing
 */
export function useEditMode<T>(initialDraft: T): UseEditModeReturn<T> {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<T>(initialDraft);

  const startEditing = useCallback((value: T) => {
    setDraft(value);
    setIsEditing(true);
  }, []);

  const save = useCallback((): T => {
    setIsEditing(false);
    return draft;
  }, [draft]);

  const cancel = useCallback(() => {
    setDraft(initialDraft);
    setIsEditing(false);
  }, [initialDraft]);

  return { isEditing, draft, setDraft, startEditing, save, cancel };
}
