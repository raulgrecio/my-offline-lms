import { type LearningPath } from '@core/domain';
import type { ILearningPathRepository } from "../domain/ports/ILearningPathRepository";
import { type CourseWithOrderInPath } from "../domain/model/CourseWithOrderInPath";
import { getCoursesForPathId, type GetCoursesForPathIdRequest } from "./use-cases/getCoursesForPathId";
import { getLearningPathById, type GetLearningPathByIdRequest } from "./use-cases/getLearningPath";
import { getAllLearningPaths } from "./use-cases/getAllLearningPaths";
import { getLearningPathDetails, type GetLearningPathDetailsRequest, type PathWithCourses } from "./use-cases/getLearningPathDetails";

export class LearningPathManager {
  constructor(private repo: ILearningPathRepository) { }

  getAllLearningPaths(): LearningPath[] {
    return getAllLearningPaths(this.repo);
  }

  getLearningPathDetails(request: GetLearningPathDetailsRequest): PathWithCourses | null {
    return getLearningPathDetails(this.repo, request);
  }

  getLearningPathById(request: GetLearningPathByIdRequest): LearningPath | null {
    return getLearningPathById(this.repo, request);
  }

  getCoursesForPathId(request: GetCoursesForPathIdRequest): CourseWithOrderInPath[] {
    return getCoursesForPathId(this.repo, request);
  }
}
