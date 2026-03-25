import { describe, it, expect, beforeEach, vi } from "vitest";
import { SQLiteProgressRepository } from "@features/progress/infrastructure/SQLiteProgressRepository";
import { type IDatabase } from '@my-offline-lms/core/database';

describe("SQLiteProgressRepository", () => {
  let mockDb: IDatabase;
  let repository: SQLiteProgressRepository;

  beforeEach(() => {
    mockDb = {
      prepare: vi.fn().mockReturnValue({
        get: vi.fn(),
        all: vi.fn(),
        run: vi.fn(),
      }),
      exec: vi.fn(),
      initialize: vi.fn(),
      close: vi.fn(),
    } as unknown as IDatabase;
    repository = new SQLiteProgressRepository(mockDb);
  });

  describe("getAssetProgress", () => {
    it("should return asset progress with mapped fields", () => {
      const mockGet = vi.fn().mockReturnValue({
        asset_id: "a1",
        asset_type: "video",
        position: 10,
        max_position: 20,
        visited_segments: 5,
        total_segments: 10,
        completed: 1,
        updated_at: "2024-01-01",
      });
      vi.mocked(mockDb.prepare).mockReturnValue({ get: mockGet } as any);

      const result = repository.getAssetProgress({ id: "a1", type: "video" });

      expect(result).toEqual({
        id: "a1",
        type: "video",
        position: 10,
        maxPosition: 20,
        visitedSegments: 5,
        totalSegments: 10,
        completed: true,
        updatedAt: "2024-01-01",
      });
    });

    it("should return null if no progress found", () => {
      const mockGet = vi.fn().mockReturnValue(null);
      vi.mocked(mockDb.prepare).mockReturnValue({ get: mockGet } as any);
      const result = repository.getAssetProgress({ id: "a1", type: "video" });
      expect(result).toBeNull();
    });

    it("should handle missing optional fields in asset progress", () => {
      vi.mocked(mockDb.prepare).mockReturnValue({ 
        get: vi.fn().mockReturnValue({ asset_id: "a1", asset_type: "video" }) 
      } as any);
      const result = repository.getAssetProgress({ id: "a1", type: "video" });
      expect(result?.position).toBe(0);
      expect(result?.visitedSegments).toBe(0);
      expect(result?.maxPosition).toBe(0);
    });

    it("should handle missing asset_type in row", () => {
      vi.mocked(mockDb.prepare).mockReturnValue({ 
        get: vi.fn().mockReturnValue({ asset_id: "a1", position: 10 }) 
      } as any);
      const result = repository.getAssetProgress({ id: "a1", type: "video" });
      expect(result?.type).toBe("video");
      expect(result?.maxPosition).toBe(10);
    });
  });

  describe("saveAssetProgress", () => {
    it("should upsert asset progress", () => {
      const mockRun = vi.fn();
      vi.mocked(mockDb.prepare).mockReturnValue({ run: mockRun } as any);

      repository.saveAssetProgress({
        id: "a1",
        type: "video",
        position: 30,
        maxPosition: 40,
        completed: true,
      });

      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO UserProgress"));
      expect(mockRun).toHaveBeenCalledWith("a1", "video", 30, 40, 1);
    });
  });

  describe("recalculateCourseProgress", () => {
    it("should run the recalculation query for the given course", () => {
      const mockRun = vi.fn();
      vi.mocked(mockDb.prepare).mockReturnValue({ run: mockRun } as any);

      repository.recalculateCourseProgress("c1");

      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO UserCollectionProgress"));
      expect(mockRun).toHaveBeenCalledWith("c1");
    });
  });

  describe("getVisitedSegments", () => {
    it("should return a sorted array of unique segments", () => {
      const mockAll = vi.fn().mockReturnValue([{ segment: 5 }, { segment: 2 }]);
      vi.mocked(mockDb.prepare).mockReturnValue({ all: mockAll } as any);

      const result = repository.getVisitedSegments({ id: "a1", type: "video" });
      expect(result).toEqual([5, 2]);
    });

    it("should return an empty array if rows are null/empty", () => {
      vi.mocked(mockDb.prepare).mockReturnValue({ all: vi.fn().mockReturnValue(null) } as any);
      expect(repository.getVisitedSegments({ id: "a1", type: "video" })).toEqual([]);
    });
  });

  describe("getVisitedSegmentsCount", () => {
    it("should get visited segments count", () => {
      vi.mocked(mockDb.prepare).mockReturnValue({ get: vi.fn().mockReturnValue({ count: 5 }) } as any);
      expect(repository.getVisitedSegmentsCount({ id: "a1", type: "video" })).toBe(5);
    });

    it("should return 0 if no count row", () => {
      vi.mocked(mockDb.prepare).mockReturnValue({ get: vi.fn().mockReturnValue(null) } as any);
      expect(repository.getVisitedSegmentsCount({ id: "a1", type: "video" })).toBe(0);
    });
  });

  describe("getCollectionProgress", () => {
    it("should return collection progress", () => {
      vi.mocked(mockDb.prepare).mockReturnValue({ 
        get: vi.fn().mockReturnValue({ id: "c1", type: "course", status: "completed", completed_items: 5, total_items: 5 }) 
      } as any);

      const result = repository.getCollectionProgress({ id: "c1", type: "course" });
      expect(result?.completedItems).toBe(5);
    });

    it("should return null if not found", () => {
      vi.mocked(mockDb.prepare).mockReturnValue({ get: vi.fn().mockReturnValue(null) } as any);
      expect(repository.getCollectionProgress({ id: "c1", type: "course" })).toBeNull();
    });

    it("should handle missing optional fields and type", () => {
      vi.mocked(mockDb.prepare).mockReturnValue({ get: vi.fn().mockReturnValue({ id: "c1" }) } as any);
      const result = repository.getCollectionProgress({ id: "c1", type: "course" });
      expect(result?.completedItems).toBe(0);
      expect(result?.type).toBe("course");
    });
  });

  describe("getAllCollectionsProgress", () => {
    it("should get all collections progress", () => {
      vi.mocked(mockDb.prepare).mockReturnValue({ all: vi.fn().mockReturnValue([{ id: "c1", completed_items: 2 }]) } as any);
      const result = repository.getAllCollectionsProgress("course");
      expect(result[0].completedItems).toBe(2);
    });

    it("should handle missing type and updated_at", () => {
      vi.mocked(mockDb.prepare).mockReturnValue({ all: vi.fn().mockReturnValue([{ id: "c1", updated_at: null }]) } as any);
      const result = repository.getAllCollectionsProgress("course");
      expect(result[0].type).toBe("course");
      expect(result[0].updatedAt).toBeUndefined();
    });
  });

  describe("getLastWatchedAsset", () => {
    it("should return last watched asset with parsed metadata", () => {
      vi.mocked(mockDb.prepare).mockReturnValue({ 
        get: vi.fn().mockReturnValue({ id: "a1", metadata: JSON.stringify({ d: 1 }) }) 
      } as any);
      const result = repository.getLastWatchedAsset();
      expect(result?.id).toBe("a1");
      expect(result?.metadata).toEqual({ d: 1 });
    });

    it("should handle missing metadata", () => {
      vi.mocked(mockDb.prepare).mockReturnValue({ get: vi.fn().mockReturnValue({ id: "a1" }) } as any);
      expect(repository.getLastWatchedAsset()?.metadata).toEqual({});
    });

    it("should return null if not found", () => {
      vi.mocked(mockDb.prepare).mockReturnValue({ get: vi.fn().mockReturnValue(null) } as any);
      expect(repository.getLastWatchedAsset()).toBeNull();
    });
  });

  describe("auxiliary queries", () => {
    it("should mark collection status", () => {
      const mockRun = vi.fn();
      vi.mocked(mockDb.prepare).mockReturnValue({ run: mockRun } as any);
      repository.markCollectionStatus({ id: "c1", type: "course", status: "completed" });
      expect(mockRun).toHaveBeenCalledWith("c1", "course", "completed");
    });

    it("should get learning paths for course", () => {
      vi.mocked(mockDb.prepare).mockReturnValue({ all: vi.fn().mockReturnValue([{ path_id: "p1" }]) } as any);
      expect(repository.getLearningPathsForCourse("c1")).toEqual(["p1"]);
    });

    it("should get course ids for asset", () => {
      vi.mocked(mockDb.prepare).mockReturnValue({ all: vi.fn().mockReturnValue([{ course_id: "c1" }]) } as any);
      expect(repository.getCourseIdsForAsset("a1")).toEqual(["c1"]);
    });

    it("should increment/set segments", () => {
      const mockRun = vi.fn();
      vi.mocked(mockDb.prepare).mockReturnValue({ run: mockRun } as any);
      repository.incrementVisitedSegments({ id: "a1", type: "video" });
      repository.setTotalSegments({ id: "a1", type: "video", totalSegments: 10 });
      expect(mockRun).toHaveBeenCalledTimes(2);
    });

    it("should recalculate learning path progress", () => {
      const mockRun = vi.fn();
      vi.mocked(mockDb.prepare).mockReturnValue({ run: mockRun } as any);
      repository.recalculateLearningPathProgress("p1");
      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining("LearningPath_Courses"));
      expect(mockRun).toHaveBeenCalledWith("p1");
    });

    it("should save segment", () => {
      vi.mocked(mockDb.prepare).mockReturnValue({ run: vi.fn().mockReturnValue({ changes: 1 }) } as any);
      expect(repository.saveSegment({ id: "a1", type: "video", segment: 1 })).toBe(true);
    });
  });
});
