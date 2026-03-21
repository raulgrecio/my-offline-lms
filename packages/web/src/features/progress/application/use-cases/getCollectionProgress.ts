import type { EnrichedCollectionProgress } from "../../domain/model/CollectionProgress";
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
): EnrichedCollectionProgress | null => {
  const progress = progressRepo.getCollectionProgress({ id, type });
  if (!progress) return null;

  return {
    ...progress,
    progress: calculateProgressPercentage(
      progress.completedItems,
      progress.inProgressItems,
      progress.totalItems
    ),
  };
};
