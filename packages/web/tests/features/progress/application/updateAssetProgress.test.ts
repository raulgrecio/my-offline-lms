import { describe, it, expect, vi } from "vitest";
import { updateAssetProgress } from "@features/progress/application/use-cases/updateAssetProgress";
import type { IProgressRepository } from "@features/progress/domain/ports/IProgressRepository";

describe("updateAssetProgress Integrity Test (PDF Guide)", () => {
  const mockRepo = (): IProgressRepository => ({
    getAssetProgress: vi.fn(),
    getCollectionProgress: vi.fn(),
    getAllCollectionsProgress: vi.fn(),
    getLastWatchedAsset: vi.fn(),
    saveAssetProgress: vi.fn(),
    markCollectionStatus: vi.fn(),
    recalculateCourseProgress: vi.fn(),
    recalculateLearningPathProgress: vi.fn(),
    getLearningPathsForCourse: vi.fn().mockReturnValue([]),
    getCourseIdsForAsset: vi.fn().mockReturnValue([]),
    saveSegment: vi.fn(),
    incrementVisitedSegments: vi.fn(),
    setTotalSegments: vi.fn(),
    getVisitedSegmentsCount: vi.fn().mockReturnValue(0),
    getVisitedSegments: vi.fn().mockReturnValue([]),
  });

  it("should correctly record page 6 of 552 without marking it as completed", () => {
    const repo = mockRepo();
    vi.mocked(repo.getAssetProgress).mockReturnValue(null);
    vi.mocked(repo.saveSegment).mockReturnValue(true);

    updateAssetProgress(repo, {
      assetId: "pdf_1",
      id: "course_1",
      type: "guide",
      position: 6,
      duration: 552
    });

    expect(repo.setTotalSegments).toHaveBeenCalledWith({
      id: "pdf_1",
      type: "guide",
      totalSegments: 552
    });

    expect(repo.saveAssetProgress).toHaveBeenCalledWith({
      id: "pdf_1",
      type: "guide",
      position: 6,
      maxPosition: 6,
      completed: false
    });
  });

  it("should NOT mark as completed when going back to page 3 after reaching page 6", () => {
    const repo = mockRepo();
    vi.mocked(repo.getAssetProgress).mockReturnValue({
      id: "pdf_1",
      type: "guide",
      position: 6,
      maxPosition: 6,
      visitedSegments: 2,
      totalSegments: 552,
      completed: false,
      updatedAt: ""
    } as any);
    vi.mocked(repo.saveSegment).mockReturnValue(false);

    updateAssetProgress(repo, {
      assetId: "pdf_1",
      id: "course_1",
      type: "guide",
      position: 3,
      duration: 552
    });

    expect(repo.saveAssetProgress).toHaveBeenCalledWith({
      id: "pdf_1",
      type: "guide",
      position: 3,
      maxPosition: 3,
      completed: false
    });
  });

  it("should mark as completed only when threshold (90%) is reached", () => {
    const repo = mockRepo();
    vi.mocked(repo.getAssetProgress).mockReturnValue({
      id: "pdf_1",
      type: "guide",
      position: 100,
      maxPosition: 496,
      visitedSegments: 496,
      totalSegments: 552,
      completed: false,
      updatedAt: ""
    } as any);
    vi.mocked(repo.saveSegment).mockReturnValue(true);

    updateAssetProgress(repo, {
      assetId: "pdf_1",
      id: "course_1",
      type: "guide",
      position: 497,
      duration: 552
    });

    expect(repo.saveAssetProgress).toHaveBeenCalledWith(expect.objectContaining({
      completed: true
    }));
  });

  it("should handle recalibration of totalSegments if it changes", () => {
    const repo = mockRepo();
    vi.mocked(repo.getAssetProgress).mockReturnValue({
      id: "pdf_1",
      type: "guide",
      position: 5,
      maxPosition: 5,
      visitedSegments: 1,
      totalSegments: 10,
      completed: false,
      updatedAt: ""
    } as any);
    vi.mocked(repo.saveSegment).mockReturnValue(true);

    updateAssetProgress(repo, {
      assetId: "pdf_1",
      id: "course_1",
      type: "guide",
      position: 10,
      duration: 552
    });

    expect(repo.setTotalSegments).toHaveBeenCalledWith({
      id: "pdf_1",
      type: "guide",
      totalSegments: 552
    });
  });

  it("should recalculate learning paths when a course is affected by completion", () => {
    const repo = mockRepo();
    vi.mocked(repo.getAssetProgress).mockReturnValue({
      id: "v1", type: "video", position: 0, maxPosition: 0, visitedSegments: 0, totalSegments: 1, completed: false, updatedAt: ""
    } as any);
    vi.mocked(repo.saveSegment).mockReturnValue(true);
    vi.mocked(repo.getCourseIdsForAsset).mockReturnValue(["c1"]);
    vi.mocked(repo.getLearningPathsForCourse).mockReturnValue(["p1"]);

    updateAssetProgress(repo, {
      assetId: "v1", id: "c1", type: "video", position: 1, duration: 1
    });

    expect(repo.recalculateCourseProgress).toHaveBeenCalledWith("c1");
    expect(repo.recalculateLearningPathProgress).toHaveBeenCalledWith("p1");
  });

  it("should fallback to maxPosition if duration is 0", () => {
    const repo = mockRepo();
    vi.mocked(repo.getAssetProgress).mockReturnValue({
      id: "g1", type: "guide", position: 5, maxPosition: 100, visitedSegments: 0, totalSegments: 0, completed: false, updatedAt: ""
    } as any);
    
    updateAssetProgress(repo, {
      assetId: "g1", id: "c1", type: "guide", position: 10
    });
    
    // should use 100 as duration
    expect(repo.setTotalSegments).toHaveBeenCalledWith(expect.objectContaining({ totalSegments: 100 }));
  });

  it("should skip status calculation if wasCompleted is true", () => {
    const repo = mockRepo();
    vi.mocked(repo.getAssetProgress).mockReturnValue({
      id: "v1", type: "video", position: 1, maxPosition: 1, visitedSegments: 1, totalSegments: 1, completed: true, updatedAt: ""
    } as any);
    
    updateAssetProgress(repo, {
      assetId: "v1", id: "c1", type: "video", position: 1, duration: 1
    });

    expect(repo.saveAssetProgress).toHaveBeenCalledWith(expect.objectContaining({ completed: true }));
  });

  it("should skip setting total segments if duration is same as current total", () => {
    const repo = mockRepo();
    vi.mocked(repo.getAssetProgress).mockReturnValue({
      id: "v1", type: "video", position: 5, maxPosition: 10, visitedSegments: 0, totalSegments: 2, completed: false, updatedAt: ""
    } as any);
    
    updateAssetProgress(repo, {
      assetId: "v1", id: "c1", type: "video", position: 10, duration: 10 // 10/5 = 2, so it's the same
    });
    
    expect(repo.setTotalSegments).not.toHaveBeenCalled();
  });

  it("should skip setting total segments if finalDuration is 0", () => {
    const repo = mockRepo();
    vi.mocked(repo.getAssetProgress).mockReturnValue(null);
    
    updateAssetProgress(repo, {
      assetId: "v1", id: "c1", type: "video", position: 10 // duration missing, existing null -> finalDuration 0
    });
    
    expect(repo.setTotalSegments).not.toHaveBeenCalled();
  });
});
