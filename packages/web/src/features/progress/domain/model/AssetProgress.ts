export interface AssetProgress {
  assetId: string;
  position: number;
  maxPosition: number;
  completed: boolean;
  updatedAt?: string;
}
