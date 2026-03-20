import type { IProgressRepository } from "../../domain/ports/IProgressRepository";
import type { AssetProgress } from "../../domain/model/AssetProgress";

export interface GetAssetProgressRequest {
  assetId: string;
}

export const getAssetProgress = (progressRepo: IProgressRepository, { assetId }: GetAssetProgressRequest): AssetProgress | null => {
  return progressRepo.getAssetProgress(assetId);
}
