import type { AssetType } from '@my-offline-lms/core/models';

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
