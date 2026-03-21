import { describe, it, expect, vi, beforeEach } from "vitest";

import { getAssetProgress } from "@features/progress/application/use-cases/getAssetProgress";
import { getCollectionProgress } from "@features/progress/application/use-cases/getCollectionProgress";
import { markCollectionStatus } from "@features/progress/application/use-cases/markCollectionStatus";
import type { IProgressRepository } from "@features/progress/domain/ports/IProgressRepository";

describe("Progress Use Cases", () => {
  let mockRepo: IProgressRepository;

  beforeEach(() => {
    mockRepo = {
      getAssetProgress: vi.fn(),
      getCollectionProgress: vi.fn(),
      markCollectionStatus: vi.fn(),
    } as unknown as IProgressRepository;
  });

  it("getAssetProgress should call repo", () => {
    getAssetProgress(mockRepo, { assetId: "a1", type: "video" });
    expect(mockRepo.getAssetProgress).toHaveBeenCalledWith({ id: "a1", type: "video" });
  });

  it("getCollectionProgress should call repo", () => {
    getCollectionProgress(mockRepo, { id: "c1", type: "course" });
    expect(mockRepo.getCollectionProgress).toHaveBeenCalledWith({ id: "c1", type: "course" });
  });

  it("markCollectionStatus should call repo", () => {
    markCollectionStatus(mockRepo, { id: "c1", type: "course", status: "completed" });
    expect(mockRepo.markCollectionStatus).toHaveBeenCalledWith({ id: "c1", type: "course", status: "completed" });
  });

  it("getCollectionProgress should return stats if found", () => {
    (mockRepo.getCollectionProgress as any).mockReturnValue({
      id: "c1",
      type: "course",
      completedItems: 1,
      inProgressItems: 0,
      totalItems: 1,
    });
    const result = getCollectionProgress(mockRepo, { id: "c1", type: "course" });
    expect(result.progress).toBe(100);
  });
});
