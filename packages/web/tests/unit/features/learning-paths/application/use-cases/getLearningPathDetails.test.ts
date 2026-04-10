import { describe, it, expect, vi } from "vitest";
import { getLearningPathDetails } from "@web/features/learning-paths/application/use-cases/getLearningPathDetails";

describe("getLearningPathDetails", () => {
  it("should fetch path and its courses", () => {
    const mockRepo = {
      getLearningPath: vi.fn().mockReturnValue({ id: "p1", title: "Path 1" }),
      getCoursesForPathId: vi.fn().mockReturnValue(["c1", "c2"]),
    };

    const result = getLearningPathDetails(mockRepo as any, { id: "p1" });

    expect(result).not.toBeNull();
    expect(result?.courses).toHaveLength(2);
    expect(mockRepo.getLearningPath).toHaveBeenCalledWith("p1");
  });
});
