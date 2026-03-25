import { describe, it, expect, vi } from "vitest";

vi.mock("@platform/db/database", () => ({
  getDb: vi.fn().mockResolvedValue({
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
  it("should provide access to all public methods", async () => {
    expect(await getAllCourses()).toBeInstanceOf(Array);
    expect(await getAssetById({ id: "a1" })).toBeDefined();
    expect(await getAssetsByCourseId({ id: "c1" })).toBeInstanceOf(Array);
    expect(await getCourseById({ id: "c1" })).toBeDefined();

    await updateAssetTotalPages({ id: "a1", totalPages: 10 });
  });
});
