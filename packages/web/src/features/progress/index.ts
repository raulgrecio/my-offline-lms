import { getDb } from "../../platform/db/database";
import { SQLiteProgressRepository } from "./infrastructure/SQLiteProgressRepository";
import { UpdateAssetProgress } from "./application/UpdateAssetProgress";
import { GetAssetProgress } from "./application/GetAssetProgress";
import { GetCourseProgress } from "./application/GetCourseProgress";
import { GetLearningPathProgress } from "./application/GetLearningPathProgress";
import { GetDashboardStatus } from "./application/GetDashboardStatus";
import { MarkCourseStatus } from "./application/MarkCourseStatus";
import type { ProgressStatus } from "./domain/model/ProgressStatus";

// 1. Wiring
const repo = new SQLiteProgressRepository(getDb());
const updateAssetProgressUC = new UpdateAssetProgress(repo);
const getAssetProgressUC = new GetAssetProgress(repo);
const getCourseProgressUC = new GetCourseProgress(repo);
const getLearningPathProgressUC = new GetLearningPathProgress(repo);
const getDashboardStatus = new GetDashboardStatus(repo);
const markCourseStatusUC = new MarkCourseStatus(repo);

// 2. Public API
export const updateVideoProgress = ({ assetId, courseId, position, duration }: { assetId: string; courseId: string; position: number; duration?: number }) =>
  updateAssetProgressUC.execute({ assetId, courseId, type: "video", position, duration });
export const updateGuideProgress = ({ assetId, courseId, position, duration }: { assetId: string; courseId: string; position: number; duration?: number }) =>
  updateAssetProgressUC.execute({ assetId, courseId, type: "guide", position, duration });
export const getAssetProgress = (assetId: string) => getAssetProgressUC.execute({ assetId });
export const getCourseProgress = (courseId: string) => getCourseProgressUC.execute({ courseId });
export const getLearningPathProgress = (pathId: string) => getLearningPathProgressUC.execute({ pathId });
export const getAllCourseProgress = () => getDashboardStatus.execute().allProgress;
export const getLastWatchedAsset = () => getDashboardStatus.execute().lastWatched;
export const markCourseStatus = ({ courseId, status }: { courseId: string, status: ProgressStatus }) =>
  markCourseStatusUC.execute({ courseId, status });
