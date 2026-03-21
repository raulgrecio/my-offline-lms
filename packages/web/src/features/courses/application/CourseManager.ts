import type { ICourseRepository } from "../domain/ports/ICourseRepository";
import { getAllCourses } from "./use-cases/getAllCourses";
import { getAssetById, type GetAssetByIdRequest } from "./use-cases/getAssetById";
import { getCourseById, type GetCourseByIdRequest } from "./use-cases/getCourseById";
import { getAssetsByCourseId, type GetAssetsByCourseIdRequest } from "./use-cases/getAssetsByCourseId";
import { updateAssetTotalPages, type UpdateAssetTotalPagesRequest } from "./use-cases/updateAssetTotalPages";

export class CourseManager {
  constructor(private repo: ICourseRepository) { }

  getAllCourses() {
    return getAllCourses(this.repo);
  }

  getAssetById(request: GetAssetByIdRequest) {
    return getAssetById(this.repo, request);
  }

  getCourseById(request: GetCourseByIdRequest) {
    return getCourseById(this.repo, request);
  }

  getAssetsByCourseId(request: GetAssetsByCourseIdRequest) {
    return getAssetsByCourseId(this.repo, request);
  }

  updateAssetTotalPages(request: UpdateAssetTotalPagesRequest) {
    return updateAssetTotalPages(this.repo, request);
  }
}
