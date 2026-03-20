import type { LearningPath } from "@my-offline-lms/core";
import type { ILearningPathRepository } from "../../domain/ports/ILearningPathRepository";
import type { GetPathDetailsRequest } from "./getPathDetails";

export const getLearningPath = (
  pathRepo: ILearningPathRepository,
  { pathId }: GetPathDetailsRequest
): LearningPath | null => {
  return pathRepo.getLearningPath(pathId);
};
