import { describe, it, expect, beforeEach } from "vitest";

import { SQLiteDatabase } from '@core/database';
import { ConsoleLogger } from "@core/logging";

import { runMigrations } from "@web/platform/db";
import { SQLiteSettingsRepository } from "@web/features/settings/infrastructure/SQLiteSettingsRepository";

describe("SQLiteSettingsRepository", () => {
  let db: SQLiteDatabase;
  let repository: SQLiteSettingsRepository;

  beforeEach(() => {
    // Inyectamos base de datos real en memoria para validar el SQL real
    db = new SQLiteDatabase(':memory:');
    db.initialize();
    runMigrations(db, new ConsoleLogger());

    repository = new SQLiteSettingsRepository(db);
  });

  describe("getActiveLearningPath", () => {
    it("should return the active learning path id from the database", () => {
      // Inserción real en la tabla
      db.prepare("INSERT INTO UserSettings (key, value) VALUES ('active_path_id', 'path-123')").run();

      const result = repository.getActiveLearningPath();

      expect(result).toBe("path-123");
    });

    it("should return null if no active path is set", () => {
      const result = repository.getActiveLearningPath();
      expect(result).toBeNull();
    });
  });

  describe("setActiveLearningPath", () => {
    it("should upsert the active path id in the database", () => {
      // Caso 1: Insertar nuevo
      repository.setActiveLearningPath("new-path-id");

      let check = db.prepare("SELECT value FROM UserSettings WHERE key = 'active_path_id'").get() as any;
      expect(check.value).toBe("new-path-id");

      // Caso 2: Actualizar existente (Upsert)
      repository.setActiveLearningPath("updated-path-id");

      check = db.prepare("SELECT value FROM UserSettings WHERE key = 'active_path_id'").get() as any;
      expect(check.value).toBe("updated-path-id");
    });
  });
});
