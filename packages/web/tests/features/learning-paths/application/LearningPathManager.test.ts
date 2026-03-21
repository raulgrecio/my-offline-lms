import { describe, it, expect, vi } from "vitest";
import { LearningPathManager } from "@features/learning-paths/application/LearningPathManager";
import { type ILearningPathRepository } from "@features/learning-paths/domain/ports/ILearningPathRepository";

describe("LearningPathManager", () => {
  const mockRepo: ILearningPathRepository = {
    getAllLearningPaths: vi.fn(),
    getLearningPath: vi.fn(),
    getCoursesForPathId: vi.fn(),
  };

  const manager = new LearningPathManager(mockRepo);

  it("should return the path catalog", () => {
    const paths = [{ id: "lp1", title: "Path 1" } as any];
    vi.mocked(mockRepo.getAllLearningPaths).mockReturnValue(paths);

    const result = manager.getAllLearningPaths();
    expect(result).toBe(paths);
    expect(mockRepo.getAllLearningPaths).toHaveBeenCalled();
  });

  it("should return a learning path by id", () => {
    const path = { id: "lp1", title: "Path 1" } as any;
    vi.mocked(mockRepo.getLearningPath).mockReturnValue(path);

    const result = manager.getLearningPathById({ id: "lp1" });
    expect(result).toBe(path);
    expect(mockRepo.getLearningPath).toHaveBeenCalledWith("lp1");
  });

  it("should return courses for a path", () => {
    const courses = [{ id: "c1", title: "Course 1" } as any];
    vi.mocked(mockRepo.getCoursesForPathId).mockReturnValue(courses);

    const result = manager.getCoursesForPathId({ id: "lp1" });
    expect(result).toBe(courses);
    expect(mockRepo.getCoursesForPathId).toHaveBeenCalledWith("lp1");
  });
});
