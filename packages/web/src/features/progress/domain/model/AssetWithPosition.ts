import { type Asset } from '@core/domain';

export type AssetWithPosition = Asset & { position: number };
