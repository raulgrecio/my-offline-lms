import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import sharp from "sharp";

import { AssetPathResolver, NodeFileSystem } from "@my-offline-lms/core";

import { ASSET_PATHS_CONFIG, ASSETS_DIR, MONOREPO_ROOT } from "@config/paths";

import { IAssetStorage, PDFOptions } from "@features/asset-download/domain/ports/IAssetStorage";

export class DiskAssetStorage implements IAssetStorage {
  private assetsBaseDir: string;
  private resolver: AssetPathResolver;

  constructor(baseDir?: string) {
    this.assetsBaseDir = baseDir || ASSETS_DIR;
    const fsAdapter = new NodeFileSystem();
    this.resolver = new AssetPathResolver({
      configPath: ASSET_PATHS_CONFIG,
      monorepoRoot: MONOREPO_ROOT,
      fs: fsAdapter,
    });
  }

  ensureAssetDir(courseId: string, assetType: 'guides' | 'videos'): string {
    const dir = path.join(this.assetsBaseDir, String(courseId), assetType);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  ensureTempDir(courseId: string, assetId: string): string {
    const guidesDir = this.ensureAssetDir(courseId, 'guides');
    const tempDir = path.join(guidesDir, `temp_${assetId}`);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    return tempDir;
  }

  removeTempDir(tempDir: string): void {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }

  assetExists(filePath: string): boolean {
    if (fs.existsSync(filePath)) return true;
    // Tenta encontrar em outras localizações se a original falhar
    return this.resolver.resolveExistingPath(filePath) !== null;
  }

  /**
   * Encuentra el path real de un asset buscando en todas las ubicaciones configuradas.
   */
  findExistingAsset(courseId: string, assetType: 'guides' | 'videos', filename: string): string | null {
    return this.resolver.findAsset(courseId, assetType, filename);
  }

  verifyVideoIntegrity(videoPath: string): boolean {
    const actualPath = this.resolver.resolveExistingPath(videoPath) || videoPath;
    if (!fs.existsSync(actualPath)) return false;
    const stats = fs.statSync(actualPath);
    if (stats.size < 200000) return false;
    return true;
  }

  writeTempImage(imagePath: string, buffer: Buffer): void {
    fs.writeFileSync(imagePath, buffer);
  }

  getTempImageSize(imagePath: string): number {
    if (!fs.existsSync(imagePath)) return 0;
    return fs.statSync(imagePath).size;
  }

  buildPDFFromImages(sourceDir: string, outputPath: string, options: PDFOptions = { optimize: false, quality: 80 }): Promise<void> {
    return new Promise((resolve, reject) => {
      const files = fs.readdirSync(sourceDir).filter(f => f.endsWith(".png")).sort();
      if (files.length === 0) {
        return reject(new Error("No hay imágenes para crear PDF"));
      }

      const doc = new PDFDocument({ autoFirstPage: false });
      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);

      (async () => {
        try {
          for (const file of files) {
            const imgPath = path.join(sourceDir, file);
            if (options.optimize) {
              const optBuffer = await sharp(imgPath).jpeg({ quality: options.quality }).toBuffer();
              const meta = await sharp(optBuffer).metadata();
              doc.addPage({ size: [meta.width!, meta.height!], margin: 0 });
              doc.image(optBuffer, 0, 0, { width: meta.width, height: meta.height });
            } else {
              const meta = await sharp(imgPath).metadata();
              doc.addPage({ size: [meta.width!, meta.height!], margin: 0 });
              doc.image(imgPath, 0, 0, { width: meta.width, height: meta.height });
            }
          }
          doc.end();
        } catch (e) { reject(e); }
      })();

      stream.on("finish", () => resolve());
      stream.on("error", (e) => reject(e));
    });
  }
}
