import { type GuideMetadata } from '@core/domain';
import type { ICourseRepository } from "../../domain/ports/ICourseRepository";

export interface UpdateAssetTotalPagesRequest {
  id: string;
  totalPages: number;
}

export const updateAssetTotalPages = (repository: ICourseRepository, { id, totalPages }: UpdateAssetTotalPagesRequest): void => {
  const asset = repository.getAssetById(id);
  if (!asset) {
    throw new Error(`Asset with id ${id} not found`);
  }

  const newMetadata: GuideMetadata = {
    ...(asset.metadata as GuideMetadata),
    totalPages: Number(totalPages)
  };

  repository.updateAssetMetadata({ id, metadata: newMetadata });
}
