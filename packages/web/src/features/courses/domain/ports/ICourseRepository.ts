import { type Course, type Asset, type Metadata } from "@my-offline-lms/core";

export interface ICourseRepository {
  getAllCourses(): Course[];
  getCourseById(id: string): Course | null;
  getAssetsByCourseId(id: string): Asset[];
  getAssetById(id: string): Asset | null;
  updateAssetMetadata({ id, metadata }: { id: string, metadata: Metadata }): void;
}
