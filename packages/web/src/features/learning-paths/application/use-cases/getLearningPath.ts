import type { LearningPath } from '@core/domain';
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
