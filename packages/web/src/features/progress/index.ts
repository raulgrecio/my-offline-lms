import { type AssetType } from '@my-offline-lms/core/models';
import { getDb } from "@platform/db/database";
import { ProgressManager } from "./application/ProgressManager";
import type { GetAssetProgressRequest } from "./application/use-cases/getAssetProgress";
import type { GetCollectionProgressRequest } from "./application/use-cases/getCollectionProgress";
import type { MarkCollectionStatusRequest } from "./application/use-cases/markCollectionStatus";
import type { UpdateAssetProgressRequest } from "./application/use-cases/updateAssetProgress";
import { SQLiteProgressRepository } from "./infrastructure/SQLiteProgressRepository";

// 1. Types
export type {
  GetAssetProgressRequest,
  GetCollectionProgressRequest,
  MarkCollectionStatusRequest,
  UpdateAssetProgressRequest,
};

// 2. Wiring
const repo = new SQLiteProgressRepository(getDb());
const manager = new ProgressManager(repo);

// 3. Public API

// get
export const getAssetProgress = (params: GetAssetProgressRequest) =>
  manager.getAssetProgress(params);

export const getCourseProgress = (params: Omit<GetCollectionProgressRequest, "type">) =>
  manager.getCollectionProgress({ ...params, type: "course" });

export const getLearningPathProgress = (params: Omit<GetCollectionProgressRequest, "type">) =>
  manager.getCollectionProgress({ ...params, type: "learning-path" });

export const getDashboardStatus = () => manager.getDashboardStatus();

// mark
export const markCourseStatus = (params: Omit<MarkCollectionStatusRequest, "type">) =>
  manager.markCollectionStatus({ ...params, type: "course" });

export const markLearningPathStatus = (params: Omit<MarkCollectionStatusRequest, "type">) =>
  manager.markCollectionStatus({ ...params, type: "learning-path" });

// update
export const updateVideoProgress = (params: Omit<UpdateAssetProgressRequest, "type">) =>
  manager.updateAssetProgress({ ...params, type: "video" });

export const updateGuideProgress = (params: Omit<UpdateAssetProgressRequest, "type">) =>
  manager.updateAssetProgress({ ...params, type: "guide" });

// Helper para mantener compatibilidad con Dashboard y otras vistas
/** @deprecated Use getDashboardStatus().allProgress o getCollectionProgress */
export const getAllCourseProgress = () => manager.getAllCourseProgress();

/** @deprecated Use getDashboardStatus().lastWatched o getLastWatchedAsset */
export const getLastWatchedAsset = () => manager.getLastWatchedAsset();

export const getVisitedSegments = (params: { id: string, type: AssetType }) =>
  manager.getVisitedSegments(params);
