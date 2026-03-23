import { AssetType } from '@my-offline-lms/core/models';

export interface PDFOptions {
  optimize: boolean;
  quality: number;
}

export interface IAssetStorage {
  ensureAssetDir(courseId: string, assetType: AssetType): Promise<string>;
  ensureTempDir(courseId: string, assetId: string): Promise<string>;
  removeTempDir(tempDir: string): Promise<void>;
  assetExists(filePath: string): Promise<boolean>;
  findExistingAsset(courseId: string, assetType: AssetType, filename: string): Promise<string | null>;
  verifyVideoIntegrity(videoPath: string): Promise<boolean>;
  writeTempImage(imagePath: string, buffer: Buffer): Promise<void>;
  getTempImageSize(imagePath: string): Promise<number>;
  buildPDFFromImages(sourceDir: string, outputPath: string, options?: PDFOptions): Promise<void>;
}
