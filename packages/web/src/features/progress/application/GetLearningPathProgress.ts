import type { EnrichedLearningPathProgress } from "../domain/model/LearningPathProgress";
import type { IProgressRepository } from "../domain/ports/IProgressRepository";
import { calculateProgressPercentage } from "./ProgressCalculator";

export class GetLearningPathProgress {
  constructor(private progressRepo: IProgressRepository) {}

  execute({ pathId }: { pathId: string }): EnrichedLearningPathProgress | null {
    const progress = this.progressRepo.getLearningPathProgress(pathId);
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
}
