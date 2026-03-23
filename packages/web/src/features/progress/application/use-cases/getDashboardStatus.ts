import type { Asset } from '@my-offline-lms/core/models';
import type { IProgressRepository } from "../../domain/ports/IProgressRepository";
import type { CollectionProgress, CollectionStats } from "../../domain/model/CollectionProgress";
import { calculateProgressPercentage } from "../calculateProgressPercentage";

export interface DashboardStatus {
  allProgress: CollectionStats[];
  lastWatched: Asset | null;
}

export const getDashboardStatus = (progressRepo: IProgressRepository): DashboardStatus => {
  const rawProgress = progressRepo.getAllCollectionsProgress("course");
  const lastWatched = progressRepo.getLastWatchedAsset();

  const allProgress: CollectionStats[] = rawProgress.map((p: CollectionProgress) => ({
    ...p,
    progress: calculateProgressPercentage(
      p.completedItems,
      p.inProgressItems,
      p.totalItems,
    ),
  }));

  return { allProgress, lastWatched };
};
