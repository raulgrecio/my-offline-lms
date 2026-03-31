import { describe, it, expect, vi } from "vitest";
import { NoopLogger } from '@core/logging';
import { runMigrations } from "@web/platform/db/schema";

describe("Database Schema Migrations", () => {
  it("should run all migrations", () => {
    const mockDb = {
      exec: vi.fn(),
      prepare: vi.fn().mockImplementation((sql: string) => ({
        all: vi.fn().mockReturnValue(sql.includes("PRAGMA") ? [{ name: "other" }] : []),
        get: vi.fn().mockReturnValue(sql.includes("sqlite_master") ? { name: "UserCollectionProgress" } : {}),
      })),
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

  it("should handle progress migration failure", () => {
    const mockLogger = { info: vi.fn(), error: vi.fn() };
    const mockDb = {
      exec: vi.fn(),
      prepare: vi.fn().mockImplementation((sql: string) => {
        if (sql.includes("UserProgress")) throw new Error("Migration failed");
        return { all: vi.fn(), get: vi.fn() };
      }),
    };

    runMigrations(mockDb as any, mockLogger as any);

    expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining("Progress migration failed"), "Migration failed");
  });

  it("should handle Migration 7 failure", () => {
    const mockLogger = { info: vi.fn(), error: vi.fn(), debug: vi.fn() };
    const mockDb = {
      exec: vi.fn(),
      prepare: vi.fn().mockImplementation((sql: string) => {
        if (sql.includes("UserFavorites")) throw new Error("Migration 7 failed");
        return { all: vi.fn(), get: vi.fn().mockReturnValue({ name: "UserFavorites" }) };
      }),
    };

    runMigrations(mockDb as any, mockLogger as any);

    expect(mockLogger.error).toHaveBeenCalledWith("Migration 7 failed:", "Migration 7 failed");
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
