import { describe, it, expect, vi } from "vitest";
import { getDashboardStatus } from "@features/progress/application/use-cases/getDashboardStatus";

describe("getDashboardStatus", () => {
  it("should return correct counts from repo", () => {
    const mockRepo = {
      getAllCollectionsProgress: vi.fn().mockReturnValue([
        { status: "completed", completedItems: 10, totalItems: 10, inProgressItems: 0 },
        { status: "in_progress", completedItems: 5, totalItems: 10, inProgressItems: 5 },
      ]),
      getLastWatchedAsset: vi.fn().mockReturnValue(null),
    };

    const result = getDashboardStatus(mockRepo as any);

    expect(result.allProgress).toHaveLength(2);
    expect(result.allProgress[0].status).toBe("completed");
    expect(result.lastWatched).toBeNull();
    expect(mockRepo.getAllCollectionsProgress).toHaveBeenCalledWith("course");
  });
});
