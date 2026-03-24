import { describe, it, expect, vi } from "vitest";

vi.mock("@platform/db/database", () => ({
  getDb: vi.fn().mockResolvedValue({
    prepare: vi.fn().mockReturnValue({
      get: vi.fn(),
      all: vi.fn().mockReturnValue([]),
      run: vi.fn(),
    }),
  }),
}));

import {
  getAllLearningPaths,
  getLearningPathById,
  getCoursesForPathId,
  getLearningPathDetails
} from "@features/learning-paths/index";

describe("Learning Paths Feature: Public API", () => {
  it("should provide access to all public methods", async () => {
    expect(await getAllLearningPaths()).toBeInstanceOf(Array);
    expect(await getLearningPathById({ id: "p1" })).toBeNull();
    expect(await getCoursesForPathId({ id: "p1" })).toBeInstanceOf(Array);
    expect(await getLearningPathDetails({ id: "p1" })).toBeNull();
  });
});
