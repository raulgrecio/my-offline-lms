import type { EnrichedCourseProgress } from "../../domain/model/CourseProgress";
import type { IProgressRepository } from "../../domain/ports/IProgressRepository";
import { calculateProgressPercentage } from "../calculateProgressPercentage";

export interface GetCourseProgressRequest {
  courseId: string;
}

export const getCourseProgress = (progressRepo: IProgressRepository, { courseId }: GetCourseProgressRequest): EnrichedCourseProgress | null => {
  const progress = progressRepo.getCourseProgress(courseId);
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
