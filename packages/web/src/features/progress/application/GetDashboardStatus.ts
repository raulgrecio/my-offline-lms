import type { Asset } from "@my-offline-lms/core";
import type { IProgressRepository } from "../domain/ports/IProgressRepository";
import type { CourseProgress } from "../domain/model/CourseProgress";

export interface DashboardStatus {
  allProgress: CourseProgress[];
  lastWatched: Asset | null;
}

export class GetDashboardStatus {
  constructor(private progressRepo: IProgressRepository) {}

  execute(): DashboardStatus {
    const allProgress = this.progressRepo.getAllCourseProgress();
    const lastWatched = this.progressRepo.getLastWatchedAsset();
    return { allProgress, lastWatched };
  }
}
