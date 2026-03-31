import { describe, it, expect, vi, beforeEach } from "vitest";

import { SQLiteDatabase } from '@core/database';
import { NodeFileSystem } from '@core/filesystem';
import { getDb } from "@web/platform/db/database";

vi.mock("@core/database", async (importOriginal) => {
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

vi.mock("@core/filesystem", async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    NodeFileSystem: vi.fn().mockImplementation(function () {
      return {
        exists: vi.fn().mockResolvedValue(true),
        mkdir: vi.fn().mockResolvedValue(undefined),
      };
    }),
  };
});

vi.mock("@web/platform/db/schema", () => ({
  runMigrations: vi.fn(),
}));

describe("Database Initialization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should initialize the database once and create directory if missing", async () => {
    const mockFs = {
      exists: vi.fn().mockResolvedValue(false),
      mkdir: vi.fn().mockResolvedValue(undefined),
    };
    vi.mocked(NodeFileSystem).mockImplementation(function () { return mockFs as any; });

    const db = await getDb();

    expect(mockFs.mkdir).toHaveBeenCalled();
    expect(SQLiteDatabase).toHaveBeenCalled();
    expect(db.initialize).toHaveBeenCalled();

    // Call again, should not initialize again
    const db2 = await getDb();
    expect(SQLiteDatabase).toHaveBeenCalledTimes(1);
    expect(db2).toBe(db);
  });
});
