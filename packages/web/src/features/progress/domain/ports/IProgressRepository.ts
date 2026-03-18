import { type Asset } from "@my-offline-lms/core";

import type { CourseProgress } from "../model/CourseProgress";
import type { AssetProgress } from "../model/AssetProgress";
import type { LearningPathProgress } from "../model/LearningPathProgress";
import type { ProgressStatus } from "../model/ProgressStatus";

export interface IProgressRepository {
  getAssetProgress(assetId: string): AssetProgress | null;
  getCourseProgress(courseId: string): CourseProgress | null;
  getLearningPathProgress(pathId: string): LearningPathProgress | null;
  getAllCourseProgress(): CourseProgress[];
  getLastWatchedAsset(): (Asset & { position: number }) | null;
  updateVideoProgress({ assetId, position, duration, completed }: { assetId: string, position: number, duration: number, completed: boolean }): void;
  updateGuideProgress({ assetId, position, duration, completed }: { assetId: string, position: number, duration: number, completed: boolean }): void;
  markCourseStatus({ courseId, status }: { courseId: string, status: ProgressStatus }): void;
  recalculateCourseProgress(courseId: string): void;
  recalculateLearningPathProgress(pathId: string): void;
  getLearningPathsForCourse(courseId: string): string[];
  getCourseIdsForAsset(assetId: string): string[];
}
