import type { Asset } from "@my-offline-lms/core";
import type { IProgressRepository } from "../domain/ports/IProgressRepository";
import type { EnrichedCourseProgress } from "../domain/model/CourseProgress";
import { calculateProgressPercentage } from "./ProgressCalculator";

export interface DashboardStatus {
  allProgress: EnrichedCourseProgress[];
  lastWatched: Asset | null;
}

export class GetDashboardStatus {
  constructor(private progressRepo: IProgressRepository) {}

  execute(): DashboardStatus {
    const rawProgress = this.progressRepo.getAllCourseProgress();
    const lastWatched = this.progressRepo.getLastWatchedAsset();
    
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
}
