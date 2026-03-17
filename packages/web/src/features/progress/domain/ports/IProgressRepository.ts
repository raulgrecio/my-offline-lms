import { type Asset } from "@my-offline-lms/core";

import type { VideoProgress } from "../model/VideoProgress";
import type { CourseProgress, CourseStatusType } from "../model/CourseProgress";
import type { PdfProgress } from "../model/PdfProgress";

export interface IProgressRepository {
  getVideoProgress(assetId: string): VideoProgress | null;
  getPdfProgress(assetId: string): PdfProgress | null;
  getCourseProgress(courseId: string): CourseProgress | null;
  getAllCourseProgress(): CourseProgress[];
  getLastWatchedAsset(): (Asset & { positionSec: number }) | null;
  updateVideoProgress({ assetId, positionSec, completed }: { assetId: string; positionSec: number; completed?: boolean }): void;
  updatePdfProgress({ assetId, page, completed }: { assetId: string, page: number, completed?: boolean }): void;
  markCourseStatus({ courseId, status }: { courseId: string, status: CourseStatusType }): void;
}
