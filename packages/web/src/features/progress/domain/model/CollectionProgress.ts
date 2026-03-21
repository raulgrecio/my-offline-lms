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

export interface CollectionStats extends CollectionProgress {
  progress: number;
}
