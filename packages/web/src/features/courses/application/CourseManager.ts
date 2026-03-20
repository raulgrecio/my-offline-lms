import type { ICourseRepository } from "../domain/ports/ICourseRepository";
import { getAllCourses } from "./use-cases/getAllCourses";
import { getAssetById, type GetAssetByIdRequest } from "./use-cases/getAssetById";
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

  getCourseDetails(request: GetCourseDetailsRequest) {
    return getCourseDetails(this.repo, request);
  }

  updateAssetMetadata(request: UpdateAssetMetadataRequest) {
    return updateAssetMetadata(this.repo, request);
  }
}
