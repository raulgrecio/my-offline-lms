import { describe, it, expect, beforeEach, vi } from "vitest";

import { type IDatabase } from '@my-offline-lms/core/database';
import { SQLiteFavoritesRepository } from "@features/favorites/infrastructure/SQLiteFavoritesRepository";

describe("SQLiteFavoritesRepository", () => {
  let mockDb: IDatabase;
  let repository: SQLiteFavoritesRepository;

  beforeEach(() => {
    mockDb = {
      prepare: vi.fn(),
    } as unknown as IDatabase;
    repository = new SQLiteFavoritesRepository(mockDb);
  });

  describe("getAll", () => {
    it("should return all favorites from the database", () => {
      const mockAll = vi.fn().mockReturnValue([
        { id: "c1", type: "course" },
        { id: "l1", type: "learning-path" },
      ]);
      vi.mocked(mockDb.prepare).mockReturnValue({ all: mockAll } as any);

      const result = repository.getAll();

      expect(mockDb.prepare).toHaveBeenCalledWith("SELECT id, type FROM UserFavorites");
      expect(result).toEqual([
        { id: "c1", type: "course" },
        { id: "l1", type: "learning-path" },
      ]);
    });
  });

  describe("getIsFavorite", () => {
    it("should return true if the item is in favorites", () => {
      const mockGet = vi.fn().mockReturnValue({ 1: 1 });
      vi.mocked(mockDb.prepare).mockReturnValue({ get: mockGet } as any);

      const result = repository.getIsFavorite({ id: "c1", type: "course" });

      expect(mockDb.prepare).toHaveBeenCalledWith(
        "SELECT 1 FROM UserFavorites WHERE id = ? AND type = ?"
      );
      expect(mockGet).toHaveBeenCalledWith("c1", "course");
      expect(result).toBe(true);
    });

    it("should return false if the item is not in favorites", () => {
      const mockGet = vi.fn().mockReturnValue(null);
      vi.mocked(mockDb.prepare).mockReturnValue({ get: mockGet } as any);

      const result = repository.getIsFavorite({ id: "c1", type: "course" });

      expect(result).toBe(false);
    });
  });

  describe("toggleFavorite", () => {
    it("should remove from favorites if it already exists", () => {
      const mockGet = vi.fn().mockReturnValue({ 1: 1 });
      const mockRun = vi.fn();
      vi.mocked(mockDb.prepare).mockImplementation((sql: string) => {
        if (sql.includes("SELECT")) return { get: mockGet } as any;
        if (sql.includes("DELETE")) return { run: mockRun } as any;
        return {} as any;
      });

      repository.toggleFavorite({ id: "c1", type: "course" });

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining("DELETE FROM UserFavorites")
      );
      expect(mockRun).toHaveBeenCalledWith("c1", "course");
    });

    it("should add to favorites if it does not exist", () => {
      const mockGet = vi.fn().mockReturnValue(null);
      const mockRun = vi.fn();
      vi.mocked(mockDb.prepare).mockImplementation((sql: string) => {
        if (sql.includes("SELECT")) return { get: mockGet } as any;
        if (sql.includes("INSERT")) return { run: mockRun } as any;
        return {} as any;
      });

      repository.toggleFavorite({ id: "c1", type: "course" });

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO UserFavorites")
      );
      expect(mockRun).toHaveBeenCalledWith("c1", "course");
    });
  });
});
