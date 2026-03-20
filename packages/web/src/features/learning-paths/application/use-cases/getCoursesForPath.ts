import type { Course } from "@my-offline-lms/core";
import type { ILearningPathRepository } from "../../domain/ports/ILearningPathRepository";
import type { GetPathDetailsRequest } from "./getPathDetails";

export const getCoursesForPath = (
  pathRepo: ILearningPathRepository,
  { pathId }: GetPathDetailsRequest
): (Course & { orderIndex: number })[] => {
  return pathRepo.getCoursesForPath(pathId);
};
