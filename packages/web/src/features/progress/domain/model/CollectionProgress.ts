import type { ProgressStatus } from "./ProgressStatus";
import type { CollectionType } from "./CollectionType";

export interface CollectionProgress {
  id: string;
  type: CollectionType;
  status: ProgressStatus;
  completedItems: number;
  inProgressItems: number;
  totalItems: number;
  updatedAt?: string;
}

export interface EnrichedCollectionProgress extends CollectionProgress {
  progress: number;
}
