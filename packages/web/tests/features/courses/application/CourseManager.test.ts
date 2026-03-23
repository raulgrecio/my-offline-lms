import { describe, it, expect, vi } from "vitest";
import { CourseManager } from "@features/courses/application/CourseManager";
import { type ICourseRepository } from "@features/courses/domain/ports/ICourseRepository";
import { type Course } from '@my-offline-lms/core/models';

describe("CourseManager", () => {
  const mockRepo: ICourseRepository = {
    getAllCourses: vi.fn(),
    getCourseById: vi.fn(),
    getAssetsByCourseId: vi.fn(),
    getAssetById: vi.fn(),
    updateAssetMetadata: vi.fn(),
  };

  const manager = new CourseManager(mockRepo);

  it("should return all courses", () => {
    const courses: Course[] = [{ id: "c1", title: "Course 1" } as any];
    vi.mocked(mockRepo.getAllCourses).mockReturnValue(courses);

    const result = manager.getAllCourses();
    expect(result).toEqual(courses);
    expect(mockRepo.getAllCourses).toHaveBeenCalled();
  });

  it("should return a course by id", () => {
    const course = { id: "c1", title: "Course 1" } as any;
    vi.mocked(mockRepo.getCourseById).mockReturnValue(course);

    const result = manager.getCourseById({ id: "c1" });
    expect(result).toBe(course);
    expect(mockRepo.getCourseById).toHaveBeenCalledWith("c1");
  });

  it("should get course assets", () => {
    const assets = [{ id: "a1", title: "Asset 1" } as any];
    vi.mocked(mockRepo.getAssetsByCourseId).mockReturnValue(assets);

    const result = manager.getAssetsByCourseId({ id: "c1" });
    expect(result).toEqual(assets);
    expect(mockRepo.getAssetsByCourseId).toHaveBeenCalledWith("c1");
  });

  it("should update asset metadata", () => {
    const asset = { id: "a1", metadata: {} } as any;
    vi.mocked(mockRepo.getAssetById).mockReturnValue(asset);

    manager.updateAssetTotalPages({ id: "a1", totalPages: 50 });
    expect(mockRepo.updateAssetMetadata).toHaveBeenCalledWith({
      id: "a1",
      metadata: { totalPages: 50 }
    });
  });
});
