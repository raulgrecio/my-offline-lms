import type { LearningPath } from '@my-offline-lms/core/models';
import type { ILearningPathRepository } from "../../domain/ports/ILearningPathRepository";


export const getAllLearningPaths = (pathRepo: ILearningPathRepository): LearningPath[] => {
  return pathRepo.getAllLearningPaths();
};
