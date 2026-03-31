import type { AssetType } from '@core/domain';

export interface AssetProgress {
  id: string;
  type: AssetType;
  position: number;
  maxPosition: number;
  visitedSegments: number;
  totalSegments: number;
  completed: boolean;
  updatedAt?: string;
}
