import type { Asset, AssetStatus, AssetType } from '@core/domain';

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
