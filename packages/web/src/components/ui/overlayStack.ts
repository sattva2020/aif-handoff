type OverlayLayerId = symbol;

const overlayStack: OverlayLayerId[] = [];
let savedOverflow: string | null = null;

export function createOverlayLayerId(label: string): OverlayLayerId {
  return Symbol(label);
}

export function pushOverlayLayer(id: OverlayLayerId): () => void {
  overlayStack.push(id);
  if (overlayStack.length === 1) {
    savedOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  return () => {
    const index = overlayStack.lastIndexOf(id);
    if (index >= 0) {
      overlayStack.splice(index, 1);
    }
    if (overlayStack.length === 0) {
      document.body.style.overflow = savedOverflow ?? "";
      savedOverflow = null;
    }
  };
}

export function isTopOverlayLayer(id: OverlayLayerId): boolean {
  return overlayStack[overlayStack.length - 1] === id;
}
