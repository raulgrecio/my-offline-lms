import { describe, it, expect, vi } from "vitest";

vi.mock("@platform/db/database", () => ({
  getDb: vi.fn().mockReturnValue({
    prepare: vi.fn().mockReturnValue({
      get: vi.fn().mockReturnValue({}),
      all: vi.fn().mockReturnValue([]),
      run: vi.fn().mockReturnValue({ changes: 1 }),
    }),
  }),
}));

import {
  getAllCourses,
  getAssetById,
  getAssetsByCourseId,
  getCourseById,
  updateAssetTotalPages
} from "@features/courses/index";

describe("Courses Feature: Public API", () => {
  it("should provide access to all public methods", () => {
    expect(getAllCourses()).toBeInstanceOf(Array);
    expect(getAssetById({ id: "a1" })).toBeDefined();
    expect(getAssetsByCourseId({ id: "c1" })).toBeInstanceOf(Array);
    expect(getCourseById({ id: "c1" })).toBeDefined();

    updateAssetTotalPages({ id: "a1", totalPages: 10 });
  });
});
