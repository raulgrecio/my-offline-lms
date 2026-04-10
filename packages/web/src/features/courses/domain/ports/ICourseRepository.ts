import { type Course, type Asset, type Metadata } from '@core/domain';

export interface ICourseRepository {
  getAllCourses(): Course[];
  getCourseById(id: string): Course | null;
  getAssetsByCourseId(id: string): Asset[];
  getAssetById(id: string): Asset | null;
  updateAssetMetadata({ id, metadata }: { id: string, metadata: Metadata }): void;
  getCoursesWithSyncStatus(): CourseWithSyncStatus[];
}

export interface CourseWithSyncStatus extends Course {
  totalAssets: number;
  downloadedAssets: number;
  totalVideos: number;
  downloadedVideos: number;
  totalGuides: number;
  downloadedGuides: number;
}
