import { type GuideMetadata, type Metadata } from "@my-offline-lms/core";
import type { ICourseRepository } from "../domain/ports/ICourseRepository";

export class UpdateGuideTotalPages {
  constructor(private repository: ICourseRepository) {}

  execute({ assetId, totalPages }: { assetId: string; totalPages: number }): void {
    const asset = this.repository.getAssetById(assetId);
    if (!asset) {
      throw new Error(`Asset with id ${assetId} not found`);
    }
    
    const newMetadata: GuideMetadata = {
      ...(asset.metadata as GuideMetadata),
      totalPages: Number(totalPages)
    };

    this.repository.updateAssetMetadata({assetId, metadata: newMetadata});
  }
}
