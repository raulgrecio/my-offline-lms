import type { Asset } from "@my-offline-lms/core";
import type { IProgressRepository } from "../../domain/ports/IProgressRepository";
import type { EnrichedCourseProgress } from "../../domain/model/CourseProgress";
import { calculateProgressPercentage } from "../calculateProgressPercentage";

export interface DashboardStatus {
  allProgress: EnrichedCourseProgress[];
  lastWatched: Asset | null;
}

export const getDashboardStatus = (progressRepo: IProgressRepository): DashboardStatus => {
  const rawProgress = progressRepo.getAllCourseProgress();
  const lastWatched = progressRepo.getLastWatchedAsset();

  const allProgress: EnrichedCourseProgress[] = rawProgress.map(p => ({
    ...p,
    progress: calculateProgressPercentage(
      p.completedAssets,
      p.inProgressAssets,
      p.totalAssets
    )
  }));

  return { allProgress, lastWatched };
}
