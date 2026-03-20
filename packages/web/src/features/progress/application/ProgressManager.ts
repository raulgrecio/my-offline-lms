import type { IProgressRepository } from "../domain/ports/IProgressRepository";
import { getAssetProgress, type GetAssetProgressRequest } from "./use-cases/getAssetProgress";
import { getCourseProgress, type GetCourseProgressRequest } from "./use-cases/getCourseProgress";
import { getDashboardStatus } from "./use-cases/getDashboardStatus";
import { getLearningPathProgress, type GetLearningPathProgressRequest } from "./use-cases/getLearningPathProgress";
import { markCourseStatus, type MarkCourseStatusRequest } from "./use-cases/markCourseStatus";
import { updateAssetProgress, type UpdateAssetProgressRequest } from "./use-cases/updateAssetProgress";

export class ProgressManager {
  constructor(private repo: IProgressRepository) { }

  getAssetProgress(params: GetAssetProgressRequest) {
    return getAssetProgress(this.repo, params);
  }

  getCourseProgress(params: GetCourseProgressRequest) {
    return getCourseProgress(this.repo, params);
  }

  getDashboardStatus() {
    return getDashboardStatus(this.repo);
  }

  getLearningPathProgress(params: GetLearningPathProgressRequest) {
    return getLearningPathProgress(this.repo, params);
  }

  markCourseStatus(params: MarkCourseStatusRequest) {
    return markCourseStatus(this.repo, params);
  }

  updateAssetProgress(params: UpdateAssetProgressRequest) {
    return updateAssetProgress(this.repo, params);
  }
}
