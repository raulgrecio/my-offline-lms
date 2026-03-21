import { describe, it, expect, beforeEach, vi } from "vitest";

import type { IDatabase } from "@my-offline-lms/core";
import { SQLiteCourseRepository } from "@features/courses/infrastructure/SQLiteCourseRepository";

describe("SQLiteCourseRepository", () => {
  let mockDb: IDatabase;
  let repository: SQLiteCourseRepository;

  beforeEach(() => {
    mockDb = {
      prepare: vi.fn(),
    } as unknown as IDatabase;
    repository = new SQLiteCourseRepository(mockDb);
  });

  describe("getAllCourses", () => {
    it("should return all courses sorted by title", () => {
      const mockAll = vi.fn().mockReturnValue([
        { id: "1", title: "A Course" },
        { id: "2", title: "B Course" },
      ]);
      vi.mocked(mockDb.prepare).mockReturnValue({ all: mockAll } as any);

      const result = repository.getAllCourses();

      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining("ORDER BY title ASC"));
      expect(result).toEqual([
        { id: "1", title: "A Course" },
        { id: "2", title: "B Course" },
      ]);
    });
  });

  describe("getCourseById", () => {
    it("should return a course by id", () => {
      const mockGet = vi.fn().mockReturnValue({ id: "1", title: "A Course" });
      vi.mocked(mockDb.prepare).mockReturnValue({ get: mockGet } as any);

      const result = repository.getCourseById("1");

      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining("WHERE id = ?"));
      expect(mockGet).toHaveBeenCalledWith("1");
      expect(result).toEqual({ id: "1", title: "A Course" });
    });

    it("should return null if course not found", () => {
      const mockGet = vi.fn().mockReturnValue(null);
      vi.mocked(mockDb.prepare).mockReturnValue({ get: mockGet } as any);

      const result = repository.getCourseById("non-existent");

      expect(result).toBeNull();
    });
  });

  describe("getAssetsByCourseId", () => {
    it("should return assets for a course with parsed metadata", () => {
      const mockAll = vi.fn().mockReturnValue([
        {
          id: "a1",
          course_id: "c1",
          type: "video",
          url: "url1",
          metadata: '{"name": "test-asset", "duration": 100}',
          status: "available",
          local_path: "/path1",
        },
      ]);
      vi.mocked(mockDb.prepare).mockReturnValue({ all: mockAll } as any);

      const result = repository.getAssetsByCourseId("c1");

      expect(result[0]).toEqual({
        id: "a1",
        courseId: "c1",
        type: "video",
        url: "url1",
        metadata: { name: "test-asset", duration: 100 },
        status: "available",
        localPath: "/path1",
      });
    });

    it("should handle empty metadata", () => {
      const mockAll = vi.fn().mockReturnValue([
        {
          id: "a1",
          course_id: "c1",
          type: "video",
          url: "url1",
          metadata: null,
          status: "available",
          local_path: "/path1",
        },
      ]);
      vi.mocked(mockDb.prepare).mockReturnValue({ all: mockAll } as any);

      const result = repository.getAssetsByCourseId("c1");

      expect(result[0].metadata).toEqual({});
    });
  });

  describe("getAssetById", () => {
    it("should return an asset by id with parsed metadata", () => {
      const mockGet = vi.fn().mockReturnValue({
        id: "a1",
        course_id: "c1",
        type: "video",
        url: "url1",
        metadata: '{"name": "test-asset", "duration": 100}',
        status: "available",
        local_path: "/path1",
      });
      vi.mocked(mockDb.prepare).mockReturnValue({ get: mockGet } as any);

      const result = repository.getAssetById("a1");

      expect(result).toEqual({
        id: "a1",
        courseId: "c1",
        type: "video",
        url: "url1",
        metadata: { name: "test-asset", duration: 100 },
        status: "available",
        localPath: "/path1",
      });
    });

    it("should return null if asset not found", () => {
      const mockGet = vi.fn().mockReturnValue(null);
      vi.mocked(mockDb.prepare).mockReturnValue({ get: mockGet } as any);

      const result = repository.getAssetById("non-existent");

      expect(result).toBeNull();
    });
  });

  describe("updateAssetMetadata", () => {
    it("should update asset metadata successfully", () => {
      const mockRun = vi.fn().mockReturnValue({ changes: 1 });
      vi.mocked(mockDb.prepare).mockReturnValue({ run: mockRun } as any);

      repository.updateAssetMetadata({ id: "a1", metadata: { name: "updated", duration: 200 } });

      expect(mockRun).toHaveBeenCalledWith('{"name":"updated","duration":200}', "a1");
    });

    it("should throw error if asset not found", () => {
      const mockRun = vi.fn().mockReturnValue({ changes: 0 });
      vi.mocked(mockDb.prepare).mockReturnValue({ run: mockRun } as any);

      expect(() =>
        repository.updateAssetMetadata({ id: "a1", metadata: { name: "not-found", duration: 200 } })
      ).toThrow("Asset with id a1 not found");
    });
  });
});
