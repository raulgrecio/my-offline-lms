import { type Course, type Asset, type Metadata } from "@my-offline-lms/core";

export interface ICourseRepository {
  getAllCourses(): Course[];
  getCourseById(courseId: string): Course | null;
  getCourseAssets(courseId: string): Asset[];
  getAssetById(assetId: string): Asset | null;
  updateAssetMetadata({assetId, metadata}: {assetId: string, metadata: Metadata}): void;
}
