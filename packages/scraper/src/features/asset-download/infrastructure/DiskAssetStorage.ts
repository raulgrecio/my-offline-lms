import type { IFileSystem, AssetType } from "@my-offline-lms/core";
import { AssetPathResolver, NodeFileSystem, ASSET_FOLDERS } from "@my-offline-lms/core";
import PDFDocument from "pdfkit";
import sharp from "sharp";

import { ASSET_PATHS_CONFIG, ASSETS_DIR, MONOREPO_ROOT } from "@config/paths";
import { IAssetStorage, PDFOptions } from "@features/asset-download/domain/ports/IAssetStorage";

export class DiskAssetStorage implements IAssetStorage {
  private assetsBaseDir: string;
  private resolver: AssetPathResolver;
  private fs: IFileSystem;

  constructor(baseDir?: string, fsAdapter?: IFileSystem) {
    this.fs = fsAdapter || new NodeFileSystem();
    this.assetsBaseDir = baseDir || ASSETS_DIR;
    this.resolver = new AssetPathResolver({
      configPath: ASSET_PATHS_CONFIG,
      monorepoRoot: MONOREPO_ROOT,
      fs: this.fs,
    });
  }

  ensureAssetDir(courseId: string, assetType: AssetType): string {
    const folderName = ASSET_FOLDERS[assetType];
    const dir = this.fs.join(this.assetsBaseDir, String(courseId), folderName);
    if (!this.fs.existsSync(dir)) {
      this.fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  ensureTempDir(courseId: string, assetId: string): string {
    const guidesDir = this.ensureAssetDir(courseId, 'guide');
    const tempDir = this.fs.join(guidesDir, `temp_${assetId}`);
    if (!this.fs.existsSync(tempDir)) {
      this.fs.mkdirSync(tempDir, { recursive: true });
    }
    return tempDir;
  }

  removeTempDir(tempDir: string): void {
    if (this.fs.existsSync(tempDir) && this.fs.rmSync) {
      this.fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }

  assetExists(filePath: string): boolean {
    if (this.fs.existsSync(filePath)) return true;
    return this.resolver.resolveExistingPath(filePath) !== null;
  }

  findExistingAsset(courseId: string, assetType: AssetType, filename: string): string | null {
    return this.resolver.findAsset(courseId, assetType, filename);
  }

  verifyVideoIntegrity(videoPath: string): boolean {
    const actualPath = this.resolver.resolveExistingPath(videoPath) || videoPath;
    if (!this.fs.existsSync(actualPath)) return false;
    const stats = this.fs.statSync(actualPath);
    if (stats.size < 200000) return false;
    return true;
  }

  writeTempImage(imagePath: string, buffer: Buffer): void {
    this.fs.writeFileSync(imagePath, buffer);
  }

  getTempImageSize(imagePath: string): number {
    if (!this.fs.existsSync(imagePath)) return 0;
    return this.fs.statSync(imagePath).size;
  }

  buildPDFFromImages(sourceDir: string, outputPath: string, options: PDFOptions = { optimize: false, quality: 80 }): Promise<void> {
    return new Promise((resolve, reject) => {
      const files = this.fs.readdirSync(sourceDir).filter(f => f.endsWith(".png")).sort();
      if (files.length === 0) {
        return reject(new Error("No hay imágenes para crear PDF"));
      }

      const doc = new PDFDocument({ autoFirstPage: false });
      if (!this.fs.createWriteStream) {
        return reject(new Error("FileSystem does not support writing streams"));
      }
      const stream = this.fs.createWriteStream(outputPath);
      doc.pipe(stream);

      (async () => {
        try {
          for (const file of files) {
            const imgPath = this.fs.join(sourceDir, file);
            if (options.optimize) {
              const optBuffer = await sharp(this.fs.readFileSync(imgPath)).jpeg({ quality: options.quality }).toBuffer();
              const meta = await sharp(optBuffer).metadata();
              doc.addPage({ size: [meta.width!, meta.height!], margin: 0 });
              doc.image(optBuffer, 0, 0, { width: meta.width, height: meta.height });
            } else {
              const imgBuffer = this.fs.readFileSync(imgPath);
              const meta = await sharp(imgBuffer).metadata();
              doc.addPage({ size: [meta.width!, meta.height!], margin: 0 });
              doc.image(imgBuffer, 0, 0, { width: meta.width, height: meta.height });
            }
          }
          doc.end();
        } catch (e) { reject(e); }
      })();

      stream.on("finish", () => resolve());
      stream.on("error", (e: any) => reject(e));
    });
  }
}
