import { describe, it, expect, afterEach } from "vitest";
import { readStorage, writeStorage, removeStorage } from "../lib/storage";

const TEST_KEY = "__storage_test_key__";

describe("storage utilities", () => {
  afterEach(() => {
    try {
      localStorage.removeItem(TEST_KEY);
    } catch {
      /* noop */
    }
  });

  describe("readStorage", () => {
    it("returns null for missing key", () => {
      expect(readStorage(TEST_KEY)).toBeNull();
    });

    it("returns stored value", () => {
      localStorage.setItem(TEST_KEY, "test-value");
      expect(readStorage(TEST_KEY)).toBe("test-value");
    });
  });

  describe("writeStorage", () => {
    it("stores a value", () => {
      writeStorage(TEST_KEY, "value");
      expect(localStorage.getItem(TEST_KEY)).toBe("value");
    });

    it("overwrites existing value", () => {
      localStorage.setItem(TEST_KEY, "old");
      writeStorage(TEST_KEY, "new");
      expect(localStorage.getItem(TEST_KEY)).toBe("new");
    });
  });

  describe("removeStorage", () => {
    it("removes a key", () => {
      localStorage.setItem(TEST_KEY, "value");
      removeStorage(TEST_KEY);
      expect(localStorage.getItem(TEST_KEY)).toBeNull();
    });

    it("does not throw for missing key", () => {
      expect(() => removeStorage(TEST_KEY)).not.toThrow();
    });
  });
});
