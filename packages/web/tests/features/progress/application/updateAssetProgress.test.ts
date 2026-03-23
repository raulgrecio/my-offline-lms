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
    // Simulate first visit: existing is null
    vi.mocked(repo.getAssetProgress).mockReturnValue(null);
    // saveSegment will return true for a new page
    vi.mocked(repo.saveSegment).mockReturnValue(true);

    updateAssetProgress(repo, {
      assetId: "pdf_1",
      id: "course_1",
      type: "guide",
      position: 6,
      duration: 552
    });

    // 1. Should set totalSegments to 552
    expect(repo.setTotalSegments).toHaveBeenCalledWith({
      id: "pdf_1",
      type: "guide",
      totalSegments: 552
    });

    // 2. Should save position 6 AND maxPosition 6 (NOT 552)
    expect(repo.saveAssetProgress).toHaveBeenCalledWith({
      id: "pdf_1",
      type: "guide",
      position: 6,
      maxPosition: 6, // Furthest reached is 6
      completed: false
    });
  });

  it("should NOT mark as completed when going back to page 3 after reaching page 6", () => {
    const repo = mockRepo();
    // Already visited page 6
    vi.mocked(repo.getAssetProgress).mockReturnValue({
      id: "pdf_1",
      type: "guide",
      position: 6,
      maxPosition: 6,
      visitedSegments: 2, // simplified for test
      totalSegments: 552,
      completed: false,
      updatedAt: ""
    });
    vi.mocked(repo.saveSegment).mockReturnValue(false); // already visited

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
      position: 3, // current position for resume
      maxPosition: 3, // repository handles MAX(6, 3) = 6 internally
      completed: false
    });
  });

  it("should mark as completed only when threshold (90%) is reached", () => {
    const repo = mockRepo();
    // User has visited 496 unique pages of 552 (89.8% -> not completed)
    vi.mocked(repo.getAssetProgress).mockReturnValue({
      id: "pdf_1",
      type: "guide",
      position: 100,
      maxPosition: 496,
      visitedSegments: 496,
      totalSegments: 552,
      completed: false,
      updatedAt: ""
    });
    vi.mocked(repo.saveSegment).mockReturnValue(true); // new page visited

    // Visit page 497 (497/552 = 90.03% -> COMPLETED)
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
    // Previously recorded with wrong totalSegments (e.g. 10)
    vi.mocked(repo.getAssetProgress).mockReturnValue({
      id: "pdf_1",
      type: "guide",
      position: 5,
      maxPosition: 5,
      visitedSegments: 1,
      totalSegments: 10,
      completed: false,
      updatedAt: ""
    });
    vi.mocked(repo.saveSegment).mockReturnValue(true);

    // Now visit with correct duration 552
    updateAssetProgress(repo, {
      assetId: "pdf_1",
      id: "course_1",
      type: "guide",
      position: 10,
      duration: 552
    });

    // Should update totalSegments to 552
    expect(repo.setTotalSegments).toHaveBeenCalledWith({
      id: "pdf_1",
      type: "guide",
      totalSegments: 552
    });
  });
});
