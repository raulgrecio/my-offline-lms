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
      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining("course"));
      expect(mockRun).toHaveBeenCalledWith("c1");
    });
  });

  describe("getVisitedSegments", () => {
    it("should return a sorted array of unique segments from the database", () => {
      const mockAll = vi.fn().mockReturnValue([
        { segment: 5 },
        { segment: 2 },
        { segment: 10 },
      ]);

      vi.mocked(mockDb.prepare).mockReturnValue({
        all: mockAll,
        get: vi.fn(),
        run: vi.fn(),
      } as any);

      const result = repository.getVisitedSegments({
        id: "test-asset",
        type: "video"
      });

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringMatching(/SELECT segment FROM UserAssetSegments/)
      );
      expect(mockAll).toHaveBeenCalledWith("test-asset", "video");
      expect(result).toEqual([5, 2, 10]);
    });

    it("should return an empty array if no segments are found", () => {
      const mockAll = vi.fn().mockReturnValue([]);

      vi.mocked(mockDb.prepare).mockReturnValue({
        all: mockAll,
        get: vi.fn(),
        run: vi.fn(),
      } as any);

      const result = repository.getVisitedSegments({
        id: "empty-asset",
        type: "guide"
      });

      expect(result).toEqual([]);
    });
  });
  describe("getCollectionProgress", () => {
    it("should return collection progress", () => {
      const mockGet = vi.fn().mockReturnValue({
        id: "c1",
        type: "course",
        status: "completed",
        completed_items: 5,
        total_items: 5,
      });
      vi.mocked(mockDb.prepare).mockReturnValue({ get: mockGet } as any);

      const result = repository.getCollectionProgress({ id: "c1", type: "course" });
      expect(result).toEqual({
        id: "c1",
        type: "course",
        status: "completed",
        completedItems: 5,
        inProgressItems: 0,
        totalItems: 5,
        updatedAt: undefined,
      });
    });
  });

  describe("getLastWatchedAsset", () => {
    it("should return last watched video asset", () => {
      const mockGet = vi.fn().mockReturnValue({
        id: "a1",
        course_id: "c1",
        type: "video",
        url: "/test",
        position: 100,
        metadata: JSON.stringify({ duration: 300 }),
      });
      vi.mocked(mockDb.prepare).mockReturnValue({ get: mockGet } as any);

      const result = repository.getLastWatchedAsset();
      expect(result?.id).toBe("a1");
      expect(result?.position).toBe(100);
      expect(result?.metadata).toEqual({ duration: 300 });
    });
  });

  describe("markCollectionStatus", () => {
    it("should update collection status", () => {
      const mockRun = vi.fn();
      vi.mocked(mockDb.prepare).mockReturnValue({ run: mockRun } as any);
      repository.markCollectionStatus({ id: "c1", type: "course", status: "completed" });
      expect(mockRun).toHaveBeenCalledWith("c1", "course", "completed");
    });
  });

  describe("recalculateLearningPathProgress", () => {
    it("should run the recalculation query for learning path", () => {
      const mockRun = vi.fn();
      vi.mocked(mockDb.prepare).mockReturnValue({ run: mockRun } as any);
      repository.recalculateLearningPathProgress("p1");
      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining("LearningPath_Courses"));
      expect(mockRun).toHaveBeenCalledWith("p1");
    });
  });

  describe("navigation / auxiliary queries", () => {
    it("should get learning paths for course", () => {
      vi.mocked(mockDb.prepare).mockReturnValue({ all: vi.fn().mockReturnValue([{ path_id: "p1" }]) } as any);
      const res = repository.getLearningPathsForCourse("c1");
      expect(res).toEqual(["p1"]);
    });

    it("should get course ids for asset", () => {
      vi.mocked(mockDb.prepare).mockReturnValue({ all: vi.fn().mockReturnValue([{ course_id: "c1" }]) } as any);
      const res = repository.getCourseIdsForAsset("a1");
      expect(res).toEqual(["c1"]);
    });
  });

  describe("segments logic", () => {
    it("should save segment", () => {
      const mockRun = vi.fn().mockReturnValue({ changes: 1 });
      vi.mocked(mockDb.prepare).mockReturnValue({ run: mockRun } as any);
      const result = repository.saveSegment({ id: "a1", type: "video", segment: 1 });
      expect(result).toBe(true);
    });

    it("should increment visited segments", () => {
      const mockRun = vi.fn();
      vi.mocked(mockDb.prepare).mockReturnValue({ run: mockRun } as any);
      repository.incrementVisitedSegments({ id: "a1", type: "video" });
      expect(mockRun).toHaveBeenCalledWith("a1", "video");
    });

    it("should set total segments", () => {
      const mockRun = vi.fn();
      vi.mocked(mockDb.prepare).mockReturnValue({ run: mockRun } as any);
      repository.setTotalSegments({ id: "a1", type: "video", totalSegments: 10 });
      expect(mockRun).toHaveBeenCalledWith(10, "a1", "video");
    });

    it("should get visited segments count", () => {
      const mockGet = vi.fn().mockReturnValue({ count: 5 });
      vi.mocked(mockDb.prepare).mockReturnValue({ get: mockGet } as any);
      const result = repository.getVisitedSegmentsCount({ id: "a1", type: "video" });
      expect(result).toBe(5);
    });

    it("should get all collections progress", () => {
      const mockAll = vi.fn().mockReturnValue([{
        id: "c1",
        type: "course",
        status: "in_progress",
        completed_items: 2,
        in_progress_items: 1,
        total_items: 5,
        updated_at: "2024-01-01"
      }]);
      vi.mocked(mockDb.prepare).mockReturnValue({ all: mockAll } as any);

      const result = repository.getAllCollectionsProgress("course");
      expect(result[0].id).toBe("c1");
      expect(result[0].completedItems).toBe(2);
    });
  });
});
