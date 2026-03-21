import type { ILearningPathRepository } from "../domain/ports/ILearningPathRepository";
import { getCoursesForPathId, type GetCoursesForPathIdRequest } from "./use-cases/getCoursesForPathId";
import { getLearningPath } from "./use-cases/getLearningPath";
import { getAllLearningPaths } from "./use-cases/getAllLearningPaths";
import { getPathDetails, type GetPathDetailsRequest } from "./use-cases/getPathDetails";

export class LearningPathManager {
  constructor(private repo: ILearningPathRepository) { }

  getAllLearningPaths() {
    return getAllLearningPaths(this.repo);
  }

  getLearningPathDetails(request: GetPathDetailsRequest) {
    return getPathDetails(this.repo, request);
  }

  getLearningPath(request: GetPathDetailsRequest) {
    return getLearningPath(this.repo, request);
  }

  getCoursesForPathId(request: GetCoursesForPathIdRequest) {
    return getCoursesForPathId(this.repo, request);
  }
}
