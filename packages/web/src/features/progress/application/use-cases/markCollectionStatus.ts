import type { IProgressRepository } from "../../domain/ports/IProgressRepository";
import type { ProgressStatus } from "../../domain/model/ProgressStatus";
import type { CollectionType } from "../../domain/model/CollectionType";

export interface MarkCollectionStatusRequest {
  id: string;
  type: CollectionType;
  status: ProgressStatus;
}

export const markCollectionStatus = (
  progressRepo: IProgressRepository,
  { id, type, status }: MarkCollectionStatusRequest
): void => {
  progressRepo.markCollectionStatus({ id, type, status });
};
