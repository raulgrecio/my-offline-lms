import type { Asset } from "@my-offline-lms/core";
import type { ICourseRepository } from "../../domain/ports/ICourseRepository";

export interface GetAssetByIdRequest {
  assetId: string;
}

export const getAssetById = (courseRepo: ICourseRepository, { assetId }: GetAssetByIdRequest): Asset | null => {
  return courseRepo.getAssetById(assetId);
}
