import { type GuideMetadata } from "@my-offline-lms/core";
import type { ICourseRepository } from "../../domain/ports/ICourseRepository";

export interface UpdateAssetMetadataRequest {
  assetId: string;
  totalPages: number;
}

export const updateAssetMetadata = (repository: ICourseRepository, { assetId, totalPages }: UpdateAssetMetadataRequest): void => {
  const asset = repository.getAssetById(assetId);
  if (!asset) {
    throw new Error(`Asset with id ${assetId} not found`);
  }
  
  const newMetadata: GuideMetadata = {
    ...(asset.metadata as GuideMetadata),
    totalPages: Number(totalPages)
  };

  repository.updateAssetMetadata({ assetId, metadata: newMetadata });
}
