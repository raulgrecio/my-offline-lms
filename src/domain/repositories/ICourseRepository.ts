import { Course } from '../models/Course';
import { Asset, AssetStatus, AssetType } from '../models/Asset';

export interface ICourseRepository {
  /** Save or update a Course */
  saveCourse(course: Course): void;
  /** Find a Course by its ID */
  getCourseById(id: string): Course | null;
  /** Get all assets for a given course */
  getCourseAssets(courseId: string): Asset[];
}

export interface IAssetRepository {
  /** Get assets by type and status */
  getPendingAssets(courseId: string, type: AssetType): Asset[];
  /** Save or update an Asset */
  saveAsset(asset: Asset): void;
  /** Update the status of an Asset */
  updateAssetStatus(id: string, status: AssetStatus): void;
  /** Update metadata and status */
  updateAssetCompletion(id: string, metadata: any, localPath?: string): void;
  /** Find an Asset by ID */
  getAssetById(id: string): Asset | null;
  /** Count the number of assets for a course */
  countAssetsByCourseId(courseId: string): number;
}
