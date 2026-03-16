import { getDb } from "../../platform/db/database";
import { SQLiteProgressRepository } from "./infrastructure/SQLiteProgressRepository";
import { UpdateVideoProgress } from "./application/UpdateVideoProgress";
import { GetVideoProgress } from "./application/GetVideoProgress";
import { GetCourseProgress } from "./application/GetCourseProgress";
import { GetDashboardStatus } from "./application/GetDashboardStatus";
import { MarkCourseStatus } from "./application/MarkCourseStatus";
import type { CourseStatusType } from "./domain/model/CourseProgress";

// 1. Wiring
const repo = new SQLiteProgressRepository(getDb());
const updateVideoProgressUC = new UpdateVideoProgress(repo);
const getVideoProgressUC = new GetVideoProgress(repo);
const getCourseProgressUC = new GetCourseProgress(repo);
const getDashboardStatus = new GetDashboardStatus(repo);
const markCourseStatusUC = new MarkCourseStatus(repo);

// 2. Public API
export const updateVideoProgress = ({ assetId, positionSec, completed }: { assetId: string; positionSec: number; completed?: boolean }) =>
  updateVideoProgressUC.execute({ assetId, positionSec, completed });

export const getVideoProgress = (assetId: string) => getVideoProgressUC.execute({assetId});
export const getCourseProgress = (courseId: string) => getCourseProgressUC.execute({courseId});
export const getAllCourseProgress = () => getDashboardStatus.execute().allProgress;
export const getLastWatchedAsset = () => getDashboardStatus.execute().lastWatched;
export const markCourseStatus = ({ courseId, status }: { courseId: string, status: CourseStatusType }) =>
  markCourseStatusUC.execute({ courseId, status });
