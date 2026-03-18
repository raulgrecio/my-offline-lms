import type { IProgressRepository } from "../domain/ports/IProgressRepository";
import type { AssetProgress } from "../domain/model/AssetProgress";

export class GetAssetProgress {
  constructor(private repository: IProgressRepository) { }

  execute({ assetId }: { assetId: string }): AssetProgress | null {
    return this.repository.getAssetProgress(assetId);
  }
}
