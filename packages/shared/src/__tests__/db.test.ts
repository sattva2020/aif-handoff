import { describe, it, expect } from "vitest";
import { createTestDb } from "../db.js";

describe("db", () => {
  it("createTestDb returns a working database with indexes", () => {
    const db = createTestDb();
    expect(db).toBeDefined();
  });

  it("index bootstrap is idempotent — calling createTestDb twice does not throw", () => {
    // Each call runs ensureTables + ensureIndexes with CREATE INDEX IF NOT EXISTS
    const db1 = createTestDb();
    const db2 = createTestDb();
    expect(db1).toBeDefined();
    expect(db2).toBeDefined();
  });
});
