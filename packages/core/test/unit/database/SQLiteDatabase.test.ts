import { describe, it, expect, vi } from "vitest";
import { SQLiteDatabase } from "@core/database";

const mockDb = {
  prepare: vi.fn(),
  exec: vi.fn(),
  transaction: vi.fn().mockImplementation((fn) => fn),
  close: vi.fn(),
};

vi.mock("better-sqlite3", () => {
  return {
    default: vi.fn().mockImplementation(function () {
      return mockDb;
    })
  };
});

describe("SQLiteDatabase", () => {
  it("should initialize and delegate correctly", () => {
    const db = new SQLiteDatabase(":memory:");

    db.initialize();
    expect(mockDb.exec).toHaveBeenCalled();

    db.prepare("SELECT 1");
    expect(mockDb.prepare).toHaveBeenCalledWith("SELECT 1");

    db.exec("UPDATE foo");
    expect(mockDb.exec).toHaveBeenCalledWith("UPDATE foo");

    const fn = () => { };
    db.transaction(fn);
    expect(mockDb.transaction).toHaveBeenCalledWith(fn);

    db.close();
    expect(mockDb.close).toHaveBeenCalled();

    expect(db.nativeDb).toBe(mockDb);
  });
});
