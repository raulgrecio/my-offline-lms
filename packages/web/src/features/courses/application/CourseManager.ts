import type { ICourseRepository } from "../domain/ports/ICourseRepository";
import { getAllCourses } from "./use-cases/getAllCourses";
import { getAssetById, type GetAssetByIdRequest } from "./use-cases/getAssetById";
import { getCourseAssets, type GetCourseAssetsRequest } from "./use-cases/getCourseAssets";
import { getCourseById, type GetCourseByIdRequest } from "./use-cases/getCourseById";
import { getCourseDetails, type GetCourseDetailsRequest } from "./use-cases/getCourseDetails";
import { updateAssetMetadata, type UpdateAssetMetadataRequest } from "./use-cases/updateAssetMetadata";

export class CourseManager {
  constructor(private repo: ICourseRepository) { }

  getAllCourses() {
    return getAllCourses(this.repo);
  }

  getAssetById(request: GetAssetByIdRequest) {
    return getAssetById(this.repo, request);
  }

  /** @deprecated el sistema de path activo está en desuso */
  getCourseDetails(request: GetCourseDetailsRequest) {
    return getCourseDetails(this.repo, request);
  }

  getCourseById(request: GetCourseByIdRequest) {
    return getCourseById(this.repo, request);
  }

  getCourseAssets(request: GetCourseAssetsRequest) {
    return getCourseAssets(this.repo, request);
  }

  updateAssetMetadata(request: UpdateAssetMetadataRequest) {
    return updateAssetMetadata(this.repo, request);
  }
}
