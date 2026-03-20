import { getDb } from "@platform/db/database";
import { ProgressManager } from "./application/ProgressManager";
import type { GetAssetProgressRequest } from "./application/use-cases/getAssetProgress";
import type { GetCourseProgressRequest } from "./application/use-cases/getCourseProgress";
import type { GetLearningPathProgressRequest } from "./application/use-cases/getLearningPathProgress";
import type { MarkCourseStatusRequest } from "./application/use-cases/markCourseStatus";
import type { UpdateAssetProgressRequest } from "./application/use-cases/updateAssetProgress";
import { SQLiteProgressRepository } from "./infrastructure/SQLiteProgressRepository";

// 1. Types
export type {
  GetAssetProgressRequest,
  GetCourseProgressRequest,
  GetLearningPathProgressRequest,
  MarkCourseStatusRequest,
  UpdateAssetProgressRequest,
};

// 2. Wiring
const repo = new SQLiteProgressRepository(getDb());
const manager = new ProgressManager(repo);

// 3. Public API
export const getAllCourseProgress = () => manager.getDashboardStatus().allProgress;

export const getAssetProgress = ({ assetId }: GetAssetProgressRequest) => manager.getAssetProgress({ assetId });

export const getCourseProgress = ({ courseId }: GetCourseProgressRequest) => manager.getCourseProgress({ courseId });

export const getLastWatchedAsset = () => manager.getDashboardStatus().lastWatched;

export const getLearningPathProgress = ({ pathId }: GetLearningPathProgressRequest) =>
  manager.getLearningPathProgress({ pathId });

export const markCourseStatus = ({ courseId, status }: MarkCourseStatusRequest) =>
  manager.markCourseStatus({ courseId, status });

export const updateGuideProgress = ({ assetId, courseId, position, duration }: Omit<UpdateAssetProgressRequest, "type">) =>
  manager.updateAssetProgress({ assetId, courseId, type: "guide", position, duration });

export const updateVideoProgress = ({ assetId, courseId, position, duration }: Omit<UpdateAssetProgressRequest, "type">) =>
  manager.updateAssetProgress({ assetId, courseId, type: "video", position, duration });


