import type { Course, LearningPath } from "@my-offline-lms/core";
import type { ILearningPathRepository } from "../../domain/ports/ILearningPathRepository";
import { getCoursesForPath } from "./getCoursesForPath";
import { getLearningPath } from "./getLearningPath";

export interface PathWithCourses {
  path: LearningPath;
  courses: (Course & { orderIndex: number })[];
}

export interface GetPathDetailsRequest {
  pathId: string;
}

export const getPathDetails = (
  pathRepo: ILearningPathRepository,
  { pathId }: GetPathDetailsRequest
): PathWithCourses | null => {
  const path = getLearningPath(pathRepo, { pathId });
  if (!path) return null;

  const courses = getCoursesForPath(pathRepo, { pathId });
  return { path, courses };
};
