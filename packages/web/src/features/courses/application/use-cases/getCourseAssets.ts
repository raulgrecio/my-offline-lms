import type { Asset } from "@my-offline-lms/core";
import type { ICourseRepository } from "../../domain/ports/ICourseRepository";

export interface GetCourseAssetsRequest {
  courseId: string;
}

export const getCourseAssets = (
  courseRepo: ICourseRepository,
  { courseId }: GetCourseAssetsRequest
): Asset[] => {
  return courseRepo.getCourseAssets(courseId);
};
