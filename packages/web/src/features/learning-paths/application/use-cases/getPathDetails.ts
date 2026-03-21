import type { LearningPath } from "@my-offline-lms/core";
import type { ILearningPathRepository } from "../../domain/ports/ILearningPathRepository";
import type { CourseWithOrderInPath } from "../../domain/model/CourseWithOrderInPath";
import { getCoursesForPathId } from "./getCoursesForPathId";
import { getLearningPath } from "./getLearningPath";

export interface PathWithCourses {
  path: LearningPath;
  courses: CourseWithOrderInPath[];
}

export interface GetPathDetailsRequest {
  id: string;
}

export const getPathDetails = (
  pathRepo: ILearningPathRepository,
  { id }: GetPathDetailsRequest
): PathWithCourses | null => {
  const path = getLearningPath(pathRepo, { id });
  if (!path) return null;

  const courses = getCoursesForPathId(pathRepo, { id });
  return { path, courses };
};
