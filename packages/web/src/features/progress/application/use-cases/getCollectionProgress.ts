import type { CollectionStats } from "../../domain/model/CollectionProgress";
import type { CollectionType } from "../../domain/model/CollectionType";
import type { IProgressRepository } from "../../domain/ports/IProgressRepository";
import { calculateProgressPercentage } from "../calculateProgressPercentage";

export interface GetCollectionProgressRequest {
  id: string;
  type: CollectionType;
}

export const getCollectionProgress = (
  progressRepo: IProgressRepository,
  { id, type }: GetCollectionProgressRequest
): CollectionStats => {
  const progress = progressRepo.getCollectionProgress({ id, type });

  if (!progress) {
    return {
      id,
      type,
      status: "not_started",
      completedItems: 0,
      inProgressItems: 0,
      totalItems: 0,
      progress: 0,
    };
  }

  return {
    ...progress,
    progress: calculateProgressPercentage(
      progress.completedItems,
      progress.inProgressItems,
      progress.totalItems
    ),
  };
};
