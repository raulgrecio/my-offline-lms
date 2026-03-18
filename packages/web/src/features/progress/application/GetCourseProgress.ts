import type { EnrichedCourseProgress } from "../domain/model/CourseProgress";
import type { IProgressRepository } from "../domain/ports/IProgressRepository";
import { calculateProgressPercentage } from "./ProgressCalculator";

export class GetCourseProgress {
  constructor(private progressRepo: IProgressRepository) {}

  execute({courseId}: {courseId: string}): EnrichedCourseProgress | null {
    const progress = this.progressRepo.getCourseProgress(courseId);
    if (!progress) return null;

    return {
      ...progress,
      progress: calculateProgressPercentage(
        progress.completedAssets,
        progress.inProgressAssets,
        progress.totalAssets
      ),
    };
  }
}
