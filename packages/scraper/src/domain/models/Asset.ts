export type AssetType = 'guide' | 'video';
export type AssetStatus = 'PENDING' | 'DOWNLOADING' | 'COMPLETED' | 'FAILED';

export interface AssetMetadata {
  title: string;
  order_index?: number | string;
  ekitId?: string; // used for guides
  filename?: string;
  [key: string]: any;
}

export interface Asset {
  id: string;
  courseId: string;
  type: AssetType;
  url: string;
  metadata: AssetMetadata;
  status: AssetStatus;
  localPath?: string;
}
