import type { Asset } from "@my-offline-lms/core";
import type { ICourseRepository } from "../../domain/ports/ICourseRepository";

export interface GetAssetsByCourseIdRequest {
  id: string;
}

export const getAssetsByCourseId = (
  courseRepo: ICourseRepository,
  { id }: GetAssetsByCourseIdRequest
): Asset[] => {
  return courseRepo.getAssetsByCourseId(id);
};
