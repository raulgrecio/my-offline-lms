import { type Asset } from "@core/domain";
import type { ICourseRepository } from "../../domain/ports/ICourseRepository";

export interface GetAssetByIdRequest {
  id: string;
}

export const getAssetById = (courseRepo: ICourseRepository, { id }: GetAssetByIdRequest): Asset | null => {
  return courseRepo.getAssetById(id);
}
