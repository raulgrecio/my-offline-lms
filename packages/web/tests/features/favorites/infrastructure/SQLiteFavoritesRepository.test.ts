import { describe, it, expect, beforeEach } from "vitest";

import { SQLiteDatabase } from '@core/database';
import { ConsoleLogger } from "@core/logging";
import { runMigrations } from "@web/platform/db/schema";
import { SQLiteFavoritesRepository } from "@web/features/favorites/infrastructure/SQLiteFavoritesRepository";

describe("SQLiteFavoritesRepository", () => {
  let db: SQLiteDatabase;
  let repository: SQLiteFavoritesRepository;

  beforeEach(() => {
    // Inyectamos base de datos real en memoria para validar el SQL real
    db = new SQLiteDatabase(':memory:');
    db.initialize();
    runMigrations(db, new ConsoleLogger());
    
    repository = new SQLiteFavoritesRepository(db);
  });

  describe("getAll", () => {
    it("should return all favorites from the database", () => {
      // Setup real state
      db.prepare("INSERT INTO UserFavorites (id, type) VALUES ('c1', 'course')").run();
      db.prepare("INSERT INTO UserFavorites (id, type) VALUES ('l1', 'learning-path')").run();

      const result = repository.getAll();

      expect(result).toEqual([
        { id: "c1", type: "course" },
        { id: "l1", type: "learning-path" },
      ]);
    });
  });

  describe("getIsFavorite", () => {
    it("should return true if the item is in favorites", () => {
      db.prepare("INSERT INTO UserFavorites (id, type) VALUES ('c1', 'course')").run();

      const result = repository.getIsFavorite({ id: "c1", type: "course" });

      expect(result).toBe(true);
    });

    it("should return false if the item is not in favorites", () => {
      const result = repository.getIsFavorite({ id: "c1", type: "course" });

      expect(result).toBe(false);
    });
  });

  describe("toggleFavorite", () => {
    it("should remove from favorites if it already exists", () => {
      db.prepare("INSERT INTO UserFavorites (id, type) VALUES ('c1', 'course')").run();

      repository.toggleFavorite({ id: "c1", type: "course" });

      const check = db.prepare("SELECT 1 FROM UserFavorites WHERE id = 'c1'").get();
      expect(check).toBeUndefined();
    });

    it("should add to favorites if it does not exist", () => {
      repository.toggleFavorite({ id: "c1", type: "course" });

      const check = db.prepare("SELECT id, type FROM UserFavorites WHERE id = 'c1'").get() as any;
      expect(check).toBeDefined();
      expect(check.type).toBe('course');
    });
  });
});
