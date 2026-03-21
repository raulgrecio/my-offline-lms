import type { Asset } from "@my-offline-lms/core";
import type { IProgressRepository } from "../../domain/ports/IProgressRepository";
import type { EnrichedCollectionProgress } from "../../domain/model/CollectionProgress";
import { calculateProgressPercentage } from "../calculateProgressPercentage";

export interface DashboardStatus {
  allProgress: EnrichedCollectionProgress[];
  lastWatched: Asset | null;
}

export const getDashboardStatus = (progressRepo: IProgressRepository): DashboardStatus => {
  const rawProgress = progressRepo.getAllCollectionsProgress("course");
  const lastWatched = progressRepo.getLastWatchedAsset();

  const allProgress: EnrichedCollectionProgress[] = rawProgress.map((p) => ({
    ...p,
    progress: calculateProgressPercentage(
      p.completedItems,
      p.inProgressItems,
      p.totalItems,
    ),
  }));

  return { allProgress, lastWatched };
};
