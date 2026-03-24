import { type Course, type Asset } from '@my-offline-lms/core/models';
import type { ICourseRepository } from "../domain/ports/ICourseRepository";
import { getAllCourses } from "./use-cases/getAllCourses";
import { getAssetById, type GetAssetByIdRequest } from "./use-cases/getAssetById";
import { getCourseById, type GetCourseByIdRequest } from "./use-cases/getCourseById";
import { getAssetsByCourseId, type GetAssetsByCourseIdRequest } from "./use-cases/getAssetsByCourseId";
import { updateAssetTotalPages, type UpdateAssetTotalPagesRequest } from "./use-cases/updateAssetTotalPages";

export class CourseManager {
  constructor(private repo: ICourseRepository) { }

  getAllCourses(): Course[] {
    return getAllCourses(this.repo);
  }

  getAssetById(request: GetAssetByIdRequest): Asset | null {
    return getAssetById(this.repo, request);
  }

  getCourseById(request: GetCourseByIdRequest): Course | null {
    return getCourseById(this.repo, request);
  }

  getAssetsByCourseId(request: GetAssetsByCourseIdRequest): Asset[] {
    return getAssetsByCourseId(this.repo, request);
  }

  updateAssetTotalPages(request: UpdateAssetTotalPagesRequest): void {
    return updateAssetTotalPages(this.repo, request);
  }
}
