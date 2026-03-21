import type { Course } from "@my-offline-lms/core";
import type { ICourseRepository } from "../../domain/ports/ICourseRepository";

export interface GetCourseByIdRequest {
  id: string;
}

export const getCourseById = (
  courseRepo: ICourseRepository,
  { id }: GetCourseByIdRequest
): Course | null => {
  return courseRepo.getCourseById(id);
};
