import { useEffect } from "react";

interface ShortcutOptions {
  /** Key code (e.g. "KeyK") or key name (e.g. "Escape") */
  key: string;
  /** Require Cmd (Mac) / Ctrl (Windows) */
  meta?: boolean;
  /** Require Shift */
  shift?: boolean;
  /** Only active when true (default: true) */
  enabled?: boolean;
}

/**
 * Registers a global keydown listener for the given shortcut.
 * Automatically calls `preventDefault()` on match.
 */
export function useKeyboardShortcut(options: ShortcutOptions, handler: () => void) {
  const { key, meta = false, shift = false, enabled = true } = options;

  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (meta && !(event.metaKey || event.ctrlKey)) return;
      if (shift && !event.shiftKey) return;
      if (event.key !== key && event.code !== key) return;

      event.preventDefault();
      handler();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [key, meta, shift, enabled, handler]);
}
