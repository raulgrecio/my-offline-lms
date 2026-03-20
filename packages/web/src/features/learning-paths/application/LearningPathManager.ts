import type { ILearningPathRepository } from "../domain/ports/ILearningPathRepository";
import { getCoursesForPath } from "./use-cases/getCoursesForPath";
import { getLearningPath } from "./use-cases/getLearningPath";
import { getPathCatalog } from "./use-cases/getPathCatalog";
import { getPathDetails, type GetPathDetailsRequest } from "./use-cases/getPathDetails";

export class LearningPathManager {
  constructor(private repo: ILearningPathRepository) { }

  getAllLearningPaths() {
    return getPathCatalog(this.repo);
  }

  /** @deprecated use getLearningPathDetails */
  getLearningPathDetails(request: GetPathDetailsRequest) {
    return getPathDetails(this.repo, request);
  }

  getLearningPath(request: GetPathDetailsRequest) {
    return getLearningPath(this.repo, request);
  }

  getCoursesForPath(request: GetPathDetailsRequest) {
    return getCoursesForPath(this.repo, request);
  }
}
