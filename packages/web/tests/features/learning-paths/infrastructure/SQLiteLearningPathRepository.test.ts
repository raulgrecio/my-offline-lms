import { describe, it, expect, beforeEach, vi } from "vitest";

import { type IDatabase } from '@my-offline-lms/core/database';
import { SQLiteLearningPathRepository } from "@features/learning-paths/infrastructure/SQLiteLearningPathRepository";

describe("SQLiteLearningPathRepository", () => {
  let mockDb: IDatabase;
  let repository: SQLiteLearningPathRepository;

  beforeEach(() => {
    mockDb = {
      prepare: vi.fn(),
    } as unknown as IDatabase;
    repository = new SQLiteLearningPathRepository(mockDb);
  });

  describe("getAllLearningPaths", () => {
    it("should return all learning paths sorted by title", () => {
      const mockAll = vi.fn().mockReturnValue([
        { id: "1", slug: "p1", title: "A Path", description: "Desc A" },
        { id: "2", slug: "p2", title: "B Path", description: "Desc B" },
      ]);
      vi.mocked(mockDb.prepare).mockReturnValue({ all: mockAll } as any);

      const result = repository.getAllLearningPaths();

      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining("ORDER BY title ASC"));
      expect(result).toEqual([
        { id: "1", slug: "p1", title: "A Path", description: "Desc A" },
        { id: "2", slug: "p2", title: "B Path", description: "Desc B" },
      ]);
    });
  });

  describe("getLearningPath", () => {
    it("should return a learning path by id", () => {
      const mockGet = vi.fn().mockReturnValue({ id: "1", slug: "p1", title: "Path" });
      vi.mocked(mockDb.prepare).mockReturnValue({ get: mockGet } as any);

      const result = repository.getLearningPath("1");

      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining("WHERE id = ?"));
      expect(mockGet).toHaveBeenCalledWith("1");
      expect(result).toEqual({ id: "1", slug: "p1", title: "Path" });
    });

    it("should return null if not found", () => {
      const mockGet = vi.fn().mockReturnValue(null);
      vi.mocked(mockDb.prepare).mockReturnValue({ get: mockGet } as any);

      const result = repository.getLearningPath("non-existent");

      expect(result).toBeNull();
    });
  });

  describe("getCoursesForPathId", () => {
    it("should return courses associated with a learning path", () => {
      const mockAll = vi.fn().mockReturnValue([
        { id: "c1", slug: "s1", title: "Course 1", orderIndex: 1 },
        { id: "c2", slug: "s2", title: "Course 2", orderIndex: 2 },
      ]);
      vi.mocked(mockDb.prepare).mockReturnValue({ all: mockAll } as any);

      const result = repository.getCoursesForPathId("p1");

      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining("JOIN Courses"));
      expect(mockAll).toHaveBeenCalledWith("p1");
      expect(result).toEqual([
        { id: "c1", slug: "s1", title: "Course 1", orderIndex: 1 },
        { id: "c2", slug: "s2", title: "Course 2", orderIndex: 2 },
      ]);
    });
  });
});
