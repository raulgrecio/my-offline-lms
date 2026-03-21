import { describe, it, expect, vi, beforeEach } from "vitest";

import { ProgressManager } from "@features/progress/application/ProgressManager";
import type { IProgressRepository } from "@features/progress/domain/ports/IProgressRepository";

describe("ProgressManager", () => {
  let mockRepo: IProgressRepository;
  let manager: ProgressManager;

  beforeEach(() => {
    mockRepo = {
      getAssetProgress: vi.fn(),
      getCollectionProgress: vi.fn(),
      getAllCollectionsProgress: vi.fn(),
      getLastWatchedAsset: vi.fn(),
      saveAssetProgress: vi.fn(),
      markCollectionStatus: vi.fn(),
      recalculateCourseProgress: vi.fn(),
      recalculateLearningPathProgress: vi.fn(),
      getLearningPathsForCourse: vi.fn(),
      getCourseIdsForAsset: vi.fn(),
      saveSegment: vi.fn(),
      incrementVisitedSegments: vi.fn(),
      setTotalSegments: vi.fn(),
      getVisitedSegmentsCount: vi.fn(),
      getVisitedSegments: vi.fn(),
    } as unknown as IProgressRepository;
    manager = new ProgressManager(mockRepo);
  });

  it("should call repo.getAllCollectionsProgress for courses", () => {
    manager.getAllCourseProgress();
    expect(mockRepo.getAllCollectionsProgress).toHaveBeenCalledWith("course");
  });

  it("should call repo.getAllCollectionsProgress for learning paths", () => {
    manager.getAllLearningPathProgress();
    expect(mockRepo.getAllCollectionsProgress).toHaveBeenCalledWith("learning-path");
  });

  it("should call repo.getLastWatchedAsset", () => {
    manager.getLastWatchedAsset();
    expect(mockRepo.getLastWatchedAsset).toHaveBeenCalled();
  });

  it("should call repo.getVisitedSegments", () => {
    manager.getVisitedSegments({ id: "a1", type: "video" });
    expect(mockRepo.getVisitedSegments).toHaveBeenCalledWith({ id: "a1", type: "video" });
  });
});
