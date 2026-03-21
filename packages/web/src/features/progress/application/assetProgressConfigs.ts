import type { AssetType } from "@my-offline-lms/core";
import { VIDEO_SEGMENT_SIZE, GUIDE_SEGMENT_SIZE } from "./constants";

export interface AssetProgressConfig {
  getSegment: (position: number) => number;
  getTotalSegments: (duration: number) => number;
}

export const ASSET_PROGRESS_CONFIGS: Record<AssetType, AssetProgressConfig> = {
  video: {
    getSegment: (pos) => Math.floor(pos / VIDEO_SEGMENT_SIZE),
    getTotalSegments: (dur) => Math.ceil(dur / VIDEO_SEGMENT_SIZE),
  },
  guide: {
    getSegment: (pos) => pos,
    getTotalSegments: (dur) => dur,
  },
};
