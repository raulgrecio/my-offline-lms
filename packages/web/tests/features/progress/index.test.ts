import { describe, it, expect, vi } from "vitest";

// Mock the dependencies BEFORE importing the module to cover the top-level wiring
vi.mock("@platform/db/database", () => ({
  getDb: vi.fn().mockResolvedValue({
    prepare: vi.fn().mockReturnValue({
      get: vi.fn(),
      all: vi.fn().mockReturnValue([]),
      run: vi.fn().mockReturnValue({ changes: 1 }),
    }),
  }),
}));

import {
  getAssetProgress,
  getDashboardStatus,
  getCourseProgress,
  getLearningPathProgress,
  markCourseStatus,
  markLearningPathStatus,
  updateVideoProgress,
  updateGuideProgress,
  getVisitedSegments
} from "@features/progress/index";

describe("Progress Feature: Public API", () => {
  it("should provide access to all public methods", async () => {
    expect(await getDashboardStatus()).toBeDefined();
    expect(await getAssetProgress({ assetId: "a1", type: "video" })).toBeNull();
    expect(await getCourseProgress({ id: "c1" })).toBeDefined();
    expect(await getLearningPathProgress({ id: "p1" })).toBeDefined();

    await markCourseStatus({ id: "c1", status: "completed" });
    await markLearningPathStatus({ id: "p1", status: "completed" });

    await updateVideoProgress({ assetId: "a1", id: "c1", position: 10, duration: 20 });
    await updateGuideProgress({ assetId: "a1", id: "c1", position: 5, duration: 10 });

    expect(await getVisitedSegments({ id: "a1", type: "video" })).toEqual([]);
  });
});
