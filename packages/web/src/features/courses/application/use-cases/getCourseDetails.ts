import type { Course, Asset } from "@my-offline-lms/core";
import type { ICourseRepository } from "../../domain/ports/ICourseRepository";

export interface CourseWithAssets {
  course: Course;
  assets: Asset[];
}

export interface GetCourseDetailsRequest {
  courseId: string;
}

export const getCourseDetails = (courseRepo: ICourseRepository, { courseId }: GetCourseDetailsRequest): CourseWithAssets | null => {
  const course = courseRepo.getCourseById(courseId);
  if (!course) return null;

  const assets = courseRepo.getCourseAssets(courseId);
  return { course, assets };
}
