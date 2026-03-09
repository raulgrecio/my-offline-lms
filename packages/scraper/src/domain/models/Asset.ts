export type AssetType = 'guide' | 'video';
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

export interface GuideAsset extends BaseAsset {
  type: 'guide';
  metadata: GuideMetadata;
}

export interface VideoAsset extends BaseAsset {
  type: 'video';
  metadata: VideoMetadata;
}

export type Asset = GuideAsset | VideoAsset;
