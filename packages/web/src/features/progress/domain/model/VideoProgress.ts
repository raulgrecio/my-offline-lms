export interface VideoProgress {
    assetId: string;
    positionSec: number;
    maxPositionSec: number;
    completed: boolean;
    updatedAt: string;
}
