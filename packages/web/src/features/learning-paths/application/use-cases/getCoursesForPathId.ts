import type { ILearningPathRepository } from "../../domain/ports/ILearningPathRepository";
import type { CourseWithOrderInPath } from "../../domain/model/CourseWithOrderInPath";

export interface GetCoursesForPathIdRequest {
  id: string;
}

export const getCoursesForPathId = (
  pathRepo: ILearningPathRepository,
  { id }: GetCoursesForPathIdRequest
): CourseWithOrderInPath[] => {
  return pathRepo.getCoursesForPathId(id);
};
