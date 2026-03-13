export interface PDFOptions {
  optimize: boolean;
  quality: number;
}

export interface IAssetStorage {
  ensureAssetDir(courseId: string, assetType: 'guides' | 'videos'): string;
  ensureTempDir(courseId: string, assetId: string): string;
  removeTempDir(tempDir: string): void;
  assetExists(filePath: string): boolean;
  findExistingAsset(courseId: string, assetType: 'guides' | 'videos', filename: string): string | null;
  verifyVideoIntegrity(videoPath: string): boolean;
  writeTempImage(imagePath: string, buffer: Buffer): void;
  getTempImageSize(imagePath: string): number;
  buildPDFFromImages(sourceDir: string, outputPath: string, options?: PDFOptions): Promise<void>;
}
