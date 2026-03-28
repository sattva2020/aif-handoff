import "@testing-library/jest-dom/vitest";

interface StorageShape {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
  clear: () => void;
  key: (index: number) => string | null;
  readonly length: number;
}

function createMemoryStorage(): StorageShape {
  const store = new Map<string, string>();
  return {
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
    removeItem(key: string) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    get length() {
      return store.size;
    },
  };
}

const hasUsableLocalStorage =
  typeof globalThis.localStorage !== "undefined" &&
  typeof globalThis.localStorage.getItem === "function" &&
  typeof globalThis.localStorage.setItem === "function" &&
  typeof globalThis.localStorage.removeItem === "function" &&
  typeof globalThis.localStorage.clear === "function";

if (!hasUsableLocalStorage) {
  Object.defineProperty(globalThis, "localStorage", {
    value: createMemoryStorage(),
    configurable: true,
  });
}
