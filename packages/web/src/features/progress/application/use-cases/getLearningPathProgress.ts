import type { EnrichedLearningPathProgress } from "../../domain/model/LearningPathProgress";
import type { IProgressRepository } from "../../domain/ports/IProgressRepository";
import { calculateProgressPercentage } from "../calculateProgressPercentage";

export interface GetLearningPathProgressRequest {
  pathId: string;
}

export const getLearningPathProgress = (progressRepo: IProgressRepository, { pathId }: GetLearningPathProgressRequest): EnrichedLearningPathProgress | null => {
  const progress = progressRepo.getLearningPathProgress(pathId);
  if (!progress) return null;

  return {
    ...progress,
    progress: calculateProgressPercentage(
      progress.completedCourses,
      progress.inProgressCourses,
      progress.totalCourses
    ),
  };
}
