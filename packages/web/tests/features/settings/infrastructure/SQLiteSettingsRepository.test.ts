import { describe, it, expect, beforeEach, vi } from "vitest";

import type { IDatabase } from "@my-offline-lms/core";
import { SQLiteSettingsRepository } from "@features/settings/infrastructure/SQLiteSettingsRepository";

describe("SQLiteSettingsRepository", () => {
  let mockDb: IDatabase;
  let repository: SQLiteSettingsRepository;

  beforeEach(() => {
    mockDb = {
      prepare: vi.fn(),
    } as unknown as IDatabase;
    repository = new SQLiteSettingsRepository(mockDb);
  });

  describe("getActiveLearningPath", () => {
    it("should return the active learning path id from the database", () => {
      const mockGet = vi.fn().mockReturnValue({ value: "path-123" });
      vi.mocked(mockDb.prepare).mockReturnValue({ get: mockGet } as any);

      const result = repository.getActiveLearningPath();

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining("SELECT value FROM UserSettings WHERE key = 'active_path_id'")
      );
      expect(result).toBe("path-123");
    });

    it("should return null if no active path is set", () => {
      const mockGet = vi.fn().mockReturnValue(null);
      vi.mocked(mockDb.prepare).mockReturnValue({ get: mockGet } as any);

      const result = repository.getActiveLearningPath();

      expect(result).toBeNull();
    });
  });

  describe("setActiveLearningPath", () => {
    it("should upsert the active path id in the database", () => {
      const mockRun = vi.fn();
      vi.mocked(mockDb.prepare).mockReturnValue({ run: mockRun } as any);

      repository.setActiveLearningPath("new-path-id");

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO UserSettings")
      );
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining("ON CONFLICT(key) DO UPDATE SET value = excluded.value")
      );
      expect(mockRun).toHaveBeenCalledWith("new-path-id");
    });
  });
});
