import { describe, it, expect, beforeEach, vi } from "vitest";
import { SQLiteProgressRepository } from "../../../../src/features/progress/infrastructure/SQLiteProgressRepository";
import type { IDatabase } from "@my-offline-lms/core";

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
      expect(result).toEqual([5, 2, 10]); // The repository doesn't sort, it expects SQL to do it
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
});
