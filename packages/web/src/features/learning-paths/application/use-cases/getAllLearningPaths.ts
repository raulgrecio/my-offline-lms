import type { LearningPath } from '@core/domain';
import type { ILearningPathRepository } from "../../domain/ports/ILearningPathRepository";


export const getAllLearningPaths = (pathRepo: ILearningPathRepository): LearningPath[] => {
  return pathRepo.getAllLearningPaths();
};
