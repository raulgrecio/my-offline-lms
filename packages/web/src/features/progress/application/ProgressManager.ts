import { type Asset, type AssetType } from "@my-offline-lms/core/models";
import type { IProgressRepository } from "../domain/ports/IProgressRepository";
import { getAssetProgress, type GetAssetProgressRequest } from "./use-cases/getAssetProgress";
import { getCollectionProgress, type GetCollectionProgressRequest } from "./use-cases/getCollectionProgress";
import { getDashboardStatus, type DashboardStatus } from "./use-cases/getDashboardStatus";
import { markCollectionStatus, type MarkCollectionStatusRequest } from "./use-cases/markCollectionStatus";
import { updateAssetProgress, type UpdateAssetProgressRequest } from "./use-cases/updateAssetProgress";
import type { AssetProgress } from "../domain/model/AssetProgress";
import type { CollectionProgress, CollectionStats } from "../domain/model/CollectionProgress";
import type { AssetWithPosition } from "../domain/model/AssetWithPosition";

export class ProgressManager {
  constructor(private repo: IProgressRepository) { }

  getAssetProgress(params: GetAssetProgressRequest): AssetProgress | null {
    return getAssetProgress(this.repo, params);
  }

  getDashboardStatus(): DashboardStatus {
    return getDashboardStatus(this.repo);
  }

  getCollectionProgress(params: GetCollectionProgressRequest): CollectionStats {
    return getCollectionProgress(this.repo, params);
  }

  markCollectionStatus(params: MarkCollectionStatusRequest): void {
    return markCollectionStatus(this.repo, params);
  }

  updateAssetProgress(params: UpdateAssetProgressRequest): void {
    return updateAssetProgress(this.repo, params);
  }

  getAllCourseProgress(): CollectionProgress[] {
    return this.repo.getAllCollectionsProgress("course");
  }

  getAllLearningPathProgress(): CollectionProgress[] {
    return this.repo.getAllCollectionsProgress("learning-path");
  }

  getLastWatchedAsset(): AssetWithPosition | null {
    return this.repo.getLastWatchedAsset();
  }

  getVisitedSegments({ id, type }: { id: string, type: AssetType }): number[] {
    return this.repo.getVisitedSegments({ id, type }) || [];
  }
}
