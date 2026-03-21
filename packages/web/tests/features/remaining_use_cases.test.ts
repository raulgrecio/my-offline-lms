import { describe, it, expect, vi, beforeEach } from "vitest";

import { getLearningPathDetails } from "@features/learning-paths/application/use-cases/getLearningPathDetails";
import { getDashboardStatus } from "@features/progress/application/use-cases/getDashboardStatus";

describe("Remaining Use Cases", () => {
  describe("getLearningPathDetails", () => {
    it("should fetch path and its courses", async () => {
      const mockRepo = {
        getLearningPath: vi.fn().mockReturnValue({ id: "p1", title: "Path 1" }),
        getCoursesForPathId: vi.fn().mockReturnValue(["c1", "c2"]),
      };

      const result = await getLearningPathDetails(mockRepo as any, { id: "p1" });

      expect(result).not.toBeNull();
      expect(result?.courses).toHaveLength(2);
      expect(mockRepo.getLearningPath).toHaveBeenCalledWith("p1");
    });
  });

  describe("getDashboardStatus", () => {
    it("should return correct counts from repo", async () => {
      const mockRepo = {
        getAllCollectionsProgress: vi.fn().mockReturnValue([
          { status: "completed", completedItems: 10, totalItems: 10, inProgressItems: 0 },
          { status: "in_progress", completedItems: 5, totalItems: 10, inProgressItems: 5 },
        ]),
        getLastWatchedAsset: vi.fn().mockReturnValue(null),
      };

      const result = await getDashboardStatus(mockRepo as any);

      expect(result.allProgress).toHaveLength(2);
      expect(result.allProgress[0].status).toBe("completed");
      expect(result.lastWatched).toBeNull();
      expect(mockRepo.getAllCollectionsProgress).toHaveBeenCalledWith("course");
    });
  });
});
