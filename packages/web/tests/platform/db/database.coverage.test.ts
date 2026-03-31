import { describe, it, expect, vi } from "vitest";
import { SQLiteDatabase } from "@core/database";

vi.mock("@web/config/paths", () => ({
  getDbPath: vi.fn().mockResolvedValue("/tmp/test.db"),
}));

vi.mock("@core/filesystem", () => ({
  NodeFileSystem: vi.fn().mockImplementation(function () {
    return {
      exists: vi.fn().mockResolvedValue(true),
      mkdir: vi.fn().mockResolvedValue(undefined),
    };
  }),
  NodePath: vi.fn().mockImplementation(function () {
    return {
      dirname: vi.fn().mockReturnValue("/tmp"),
    };
  }),
}));

vi.mock("@core/database", () => ({
  SQLiteDatabase: vi.fn().mockImplementation(function () {
    return {
      exec: vi.fn(),
      initialize: vi.fn(),
      prepare: vi.fn().mockReturnValue({ all: vi.fn().mockReturnValue([]), get: vi.fn() }),
    };
  }),
}));

vi.mock("./schema", () => ({
  runMigrations: vi.fn(),
}));

describe("Database Initialization Coverage (Line 15)", () => {
  it("should cover line 15 by temporarily changing NODE_ENV", async () => {
    vi.stubGlobal('process', {
      ...process,
      env: { ...process.env, NODE_ENV: 'not-test' }
    });

    let verboseFn: any;
    vi.mocked(SQLiteDatabase).mockImplementation(function (path, options) {
      verboseFn = options?.verbose;
      return {
        exec: vi.fn().mockImplementation((sql) => {
          if (verboseFn) verboseFn(sql);
        }),
        initialize: vi.fn(),
        prepare: vi.fn().mockReturnValue({ all: vi.fn().mockReturnValue([]), get: vi.fn() }),
      } as any;
    });

    // Forced re-evaluation of the module
    vi.resetModules();
    const { getDb } = await import("@web/platform/db/database");

    // Trigger initialization
    const mockLogger = { debug: vi.fn(), info: vi.fn() };
    await getDb(mockLogger as any);

    // Verify it was called
    expect(mockLogger.debug).toHaveBeenCalled();

    vi.unstubAllGlobals();
  });
});
