import { type Asset, type AssetType } from '@my-offline-lms/core/models';

import type { AssetProgress } from "../model/AssetProgress";
import type { CollectionProgress } from "../model/CollectionProgress";
import type { CollectionType } from "../model/CollectionType";
import type { ProgressStatus } from "../model/ProgressStatus";

export interface IProgressRepository {
  getAssetProgress({ id, type }: { id: string, type: AssetType }): AssetProgress | null;
  getCollectionProgress({ id, type }: { id: string, type: CollectionType }): CollectionProgress | null;
  getAllCollectionsProgress(type: CollectionType): CollectionProgress[];
  getLastWatchedAsset(): (Asset & { position: number }) | null;
  saveAssetProgress({ id, type, position, maxPosition, completed }: { id: string, type: AssetType, position: number, maxPosition: number, completed: boolean }): void;
  markCollectionStatus({ id, type, status }: { id: string, type: CollectionType, status: ProgressStatus }): void;
  recalculateCourseProgress(id: string): void;
  recalculateLearningPathProgress(id: string): void;
  getLearningPathsForCourse(id: string): string[];
  getCourseIdsForAsset(id: string): string[];

  saveSegment({ id, type, segment }: { id: string, type: AssetType, segment: number }): boolean;
  incrementVisitedSegments({ id, type }: { id: string, type: AssetType }): void;
  setTotalSegments({ id, type, totalSegments }: { id: string, type: AssetType, totalSegments: number }): void;
  getVisitedSegmentsCount({ id, type }: { id: string, type: AssetType }): number;
  getVisitedSegments({ id, type }: { id: string, type: AssetType }): number[];
}
