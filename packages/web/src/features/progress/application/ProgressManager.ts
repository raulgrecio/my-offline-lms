import type { IProgressRepository } from "../domain/ports/IProgressRepository";
import { getAssetProgress, type GetAssetProgressRequest } from "./use-cases/getAssetProgress";
import { getCollectionProgress, type GetCollectionProgressRequest } from "./use-cases/getCollectionProgress";
import { getDashboardStatus } from "./use-cases/getDashboardStatus";
import { markCollectionStatus, type MarkCollectionStatusRequest } from "./use-cases/markCollectionStatus";
import { updateAssetProgress, type UpdateAssetProgressRequest } from "./use-cases/updateAssetProgress";

export class ProgressManager {
  constructor(private repo: IProgressRepository) { }

  getAssetProgress(params: GetAssetProgressRequest) {
    return getAssetProgress(this.repo, params);
  }

  getDashboardStatus() {
    return getDashboardStatus(this.repo);
  }

  getCollectionProgress(params: GetCollectionProgressRequest) {
    return getCollectionProgress(this.repo, params);
  }

  markCollectionStatus(params: MarkCollectionStatusRequest) {
    return markCollectionStatus(this.repo, params);
  }

  updateAssetProgress(params: UpdateAssetProgressRequest) {
    return updateAssetProgress(this.repo, params);
  }

  getAllCourseProgress() {
    return this.repo.getAllCollectionsProgress("course");
  }

  getAllLearningPathProgress() {
    return this.repo.getAllCollectionsProgress("learning-path");
  }

  getLastWatchedAsset() {
    return this.repo.getLastWatchedAsset();
  }
}
