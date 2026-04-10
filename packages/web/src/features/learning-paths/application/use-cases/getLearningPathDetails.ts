import type { LearningPath } from '@core/domain';
import type { ILearningPathRepository } from "../../domain/ports/ILearningPathRepository";
import type { CourseWithOrderInPath } from "../../domain/model/CourseWithOrderInPath";
import { getCoursesForPathId } from "./getCoursesForPathId";
import { getLearningPathById } from "./getLearningPath";

export interface PathWithCourses {
  path: LearningPath;
  courses: CourseWithOrderInPath[];
}

export interface GetLearningPathDetailsRequest {
  id: string;
}

export const getLearningPathDetails = (
  pathRepo: ILearningPathRepository,
  { id }: GetLearningPathDetailsRequest
): PathWithCourses | null => {
  const path = getLearningPathById(pathRepo, { id });
  if (!path) return null;

  const courses = getCoursesForPathId(pathRepo, { id });
  return { path, courses };
};
