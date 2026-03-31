import type { Asset } from '@core/domain';
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
