export type AssetType = 'guide' | 'video';

export const ASSET_FOLDERS: Record<AssetType, string> = {
  guide: 'guides',
  video: 'videos',
};
export type AssetStatus = 'PENDING' | 'DOWNLOADING' | 'COMPLETED' | 'FAILED';

export interface AssetMetadata {
  name: string;
  order_index?: number | string;
  filename?: string;
}

export interface GuideMetadata extends AssetMetadata {
  id: string;
  ekitId: string;
  gcc?: string;
  ekitType?: string;
  typeId?: string;
  offeringId?: string;
}

export interface VideoMetadata extends AssetMetadata {
  duration?: number;
}

interface BaseAsset {
  id: string;
  courseId: string;
  type: AssetType;
  url: string;
  status: AssetStatus;
  localPath?: string;
}

interface AssetBase<T extends AssetType, M> extends BaseAsset {
  type: T;
  metadata: M;
}

export type GuideAsset = AssetBase<'guide', GuideMetadata>;
export type VideoAsset = AssetBase<'video', VideoMetadata>;

export type Asset = GuideAsset | VideoAsset;
