import type { LearningPath } from '@my-offline-lms/core/models';
import type { ILearningPathRepository } from "../../domain/ports/ILearningPathRepository";

export interface GetLearningPathByIdRequest {
  id: string;
}

export const getLearningPathById = (
  pathRepo: ILearningPathRepository,
  { id }: GetLearningPathByIdRequest
): LearningPath | null => {
  return pathRepo.getLearningPath(id);
};
