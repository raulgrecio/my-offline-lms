import { type Asset } from "@my-offline-lms/core";

import type { VideoProgress } from "../model/VideoProgress";
import type { CourseProgress } from "../model/CourseProgress";

export interface IProgressRepository {
  getVideoProgress(assetId: string): VideoProgress | null;
  getCourseProgress(courseId: string): CourseProgress | null;
  getAllCourseProgress(): CourseProgress[];
  getLastWatchedAsset(): (Asset & { positionSec: number }) | null;
  updateVideoProgress(assetId: string, positionSec: number, completed?: boolean): void;
  markCourseStatus(courseId: string, status: CourseProgress["status"]): void;
}
