import { type AssetType } from '@my-offline-lms/core/models';
import { createLazyService } from "@platform/utils/lazy";
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

// 2. Wiring (Lazy)
const getManager = createLazyService(async () => {
  const db = await getDb();
  const repo = new SQLiteProgressRepository(db);
  return new ProgressManager(repo);
});

// 3. Public API

// get
export const getAssetProgress = async (params: GetAssetProgressRequest) =>
  (await getManager()).getAssetProgress(params);

export const getCourseProgress = async (params: Omit<GetCollectionProgressRequest, "type">) =>
  (await getManager()).getCollectionProgress({ ...params, type: "course" });

export const getLearningPathProgress = async (params: Omit<GetCollectionProgressRequest, "type">) =>
  (await getManager()).getCollectionProgress({ ...params, type: "learning-path" });

export const getDashboardStatus = async () => (await getManager()).getDashboardStatus();

// mark
export const markCourseStatus = async (params: Omit<MarkCollectionStatusRequest, "type">) =>
  (await getManager()).markCollectionStatus({ ...params, type: "course" });

export const markLearningPathStatus = async (params: Omit<MarkCollectionStatusRequest, "type">) =>
  (await getManager()).markCollectionStatus({ ...params, type: "learning-path" });

// update
export const updateVideoProgress = async (params: Omit<UpdateAssetProgressRequest, "type">) =>
  (await getManager()).updateAssetProgress({ ...params, type: "video" });

export const updateGuideProgress = async (params: Omit<UpdateAssetProgressRequest, "type">) =>
  (await getManager()).updateAssetProgress({ ...params, type: "guide" });

// Helper para mantener compatibilidad con Dashboard y otras vistas
/** @deprecated Use getDashboardStatus().allProgress o getCollectionProgress */
export const getAllCourseProgress = async () => (await getManager()).getAllCourseProgress();

/** @deprecated Use getDashboardStatus().lastWatched o getLastWatchedAsset */
export const getLastWatchedAsset = async () => (await getManager()).getLastWatchedAsset();

export const getVisitedSegments = async (params: { id: string, type: AssetType }) =>
  (await getManager()).getVisitedSegments(params);
