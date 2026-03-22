import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "node:fs";

import { SQLiteDatabase } from "@my-offline-lms/core";
import { getDb } from "@platform/db/database";

vi.mock("@my-offline-lms/core", async (importOriginal) => {
  const actual = await importOriginal<any>();
  const mockDb = {
    exec: vi.fn(),
    initialize: vi.fn(),
  };
  return {
    ...actual,
    SQLiteDatabase: vi.fn().mockImplementation(function () {
      return mockDb;
    }),
  };
});

vi.mock("node:fs", () => ({
  default: {
    existsSync: vi.fn(),
    mkdirSync: vi.fn(),
  },
}));

vi.mock("@platform/db/schema", () => ({
  runMigrations: vi.fn(),
}));

describe("Database Initialization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset singleton (not exported, so we might need to rely on the module state or hope it's not cached)
    // Actually, getDb is a singleton, so we test it once or mock the internal state if possible.
  });

  it("should initialize the database once and create directory if missing", () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const db = getDb();

    expect(fs.mkdirSync).toHaveBeenCalled();
    expect(SQLiteDatabase).toHaveBeenCalled();
    expect(db.initialize).toHaveBeenCalled();

    // Call again, should not initialize again
    const db2 = getDb();
    expect(SQLiteDatabase).toHaveBeenCalledTimes(1);
    expect(db2).toBe(db);
  });
});
