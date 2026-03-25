import { type AssetType } from "../domain";

export interface IAssetPathResolver {
  ensureInitialized(): Promise<void>;

  resolveExistingPath(
    filePath: string
  ): Promise<string | null>;

  findAsset(
    courseId: string,
    assetType: AssetType,
    filename: string
  ): Promise<string | null>;

  getDefaultWritePath(): Promise<string>;
}
