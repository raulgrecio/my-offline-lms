import { describe, it, expect, vi } from "vitest";
import { NoopLogger } from '@my-offline-lms/core/logging';
import { runMigrations } from "@platform/db/schema";

describe("Database Schema Migrations", () => {
  it("should run all migrations", () => {
    const mockDb = {
      exec: vi.fn(),
      prepare: vi.fn().mockReturnValue({
        all: vi.fn().mockReturnValue([]),
        get: vi.fn().mockReturnValue({}),
      }),
    };

    runMigrations(mockDb as any, new NoopLogger());

    // Initial table rename/column add (try-catch blocks)
    expect(mockDb.exec).toHaveBeenCalled();

    // Create base tables
    expect(mockDb.exec).toHaveBeenCalledWith(expect.stringContaining("CREATE TABLE IF NOT EXISTS UserProgress"));
    expect(mockDb.exec).toHaveBeenCalledWith(expect.stringContaining("CREATE TABLE IF NOT EXISTS UserCollectionProgress"));
    expect(mockDb.exec).toHaveBeenCalledWith(expect.stringContaining("CREATE TABLE IF NOT EXISTS UserSettings"));
    expect(mockDb.exec).toHaveBeenCalledWith(expect.stringContaining("CREATE TABLE IF NOT EXISTS UserFavorites"));
  });

  it("should throw if base table creation fails (not in try-catch)", () => {
    const mockDb = {
      exec: vi.fn().mockImplementation((sql: string) => {
        if (sql.includes("CREATE TABLE IF NOT EXISTS")) throw new Error("Base creation failed");
      }),
      prepare: vi.fn().mockReturnValue({
        all: vi.fn(), get: vi.fn()
      }),
    };

    expect(() => runMigrations(mockDb as any, new NoopLogger())).toThrow("Base creation failed");
  });
});
