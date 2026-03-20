import type { Course } from "@my-offline-lms/core";
import type { ICourseRepository } from "../../domain/ports/ICourseRepository";

export interface GetCourseByIdRequest {
  courseId: string;
}

export const getCourseById = (
  courseRepo: ICourseRepository,
  { courseId }: GetCourseByIdRequest
): Course | null => {
  return courseRepo.getCourseById(courseId);
};
