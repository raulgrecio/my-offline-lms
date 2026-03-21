import type { ILearningPathRepository } from "../domain/ports/ILearningPathRepository";
import { getCoursesForPathId, type GetCoursesForPathIdRequest } from "./use-cases/getCoursesForPathId";
import { getLearningPathById, type GetLearningPathByIdRequest } from "./use-cases/getLearningPath";
import { getAllLearningPaths } from "./use-cases/getAllLearningPaths";
import { getLearningPathDetails, type GetLearningPathDetailsRequest } from "./use-cases/getLearningPathDetails";
import { getLearningPathWithStats, type GetLearningPathWithStatsRequest } from "./use-cases/getLearningPathWithStats";

export class LearningPathManager {
  constructor(private repo: ILearningPathRepository) { }

  getAllLearningPaths() {
    return getAllLearningPaths(this.repo);
  }

  getLearningPathDetails(request: GetLearningPathDetailsRequest) {
    return getLearningPathDetails(this.repo, request);
  }

  getLearningPathById(request: GetLearningPathByIdRequest) {
    return getLearningPathById(this.repo, request);
  }

  getCoursesForPathId(request: GetCoursesForPathIdRequest) {
    return getCoursesForPathId(this.repo, request);
  }

  getLearningPathWithStats(request: GetLearningPathWithStatsRequest) {
    return getLearningPathWithStats(this.repo, request);
  }
}
