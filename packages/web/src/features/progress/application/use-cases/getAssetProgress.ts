import type { AssetType } from "@my-offline-lms/core";
import type { IProgressRepository } from "../../domain/ports/IProgressRepository";
import type { AssetProgress } from "../../domain/model/AssetProgress";

export interface GetAssetProgressRequest {
  assetId: string;
  type: AssetType;
}

export const getAssetProgress = (progressRepo: IProgressRepository, { assetId, type }: GetAssetProgressRequest): AssetProgress | null => {
  return progressRepo.getAssetProgress({ id: assetId, type });
}
