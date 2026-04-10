import PDFDocument from "pdfkit";
import sharp from "sharp";

import { type IAssetPathResolver, type IFileSystem, type IPath } from "@core/filesystem";
import { ASSET_FOLDERS, type AssetType } from "@core/domain";

import { getAssetsDir } from "@scraper/config";

import type { IAssetStorage, PDFOptions } from "../domain/ports/IAssetStorage";

interface DiskAssetStorageProps {
  baseDir?: string;
  fs: IFileSystem;
  path: IPath;
  resolver: IAssetPathResolver;
}

export class DiskAssetStorage implements IAssetStorage {
  private assetsBaseDir: string | undefined;
  private resolver: IAssetPathResolver;
  private fs: IFileSystem;
  private path: IPath;
  private baseDirArg?: string;

  constructor(props: DiskAssetStorageProps) {
    this.fs = props.fs;
    this.path = props.path;
    this.resolver = props.resolver;
    this.baseDirArg = props.baseDir;
  }

  private async ensureInitialized(): Promise<void> {
    if (this.assetsBaseDir) return;

    this.assetsBaseDir = this.baseDirArg || (await getAssetsDir());
    await this.resolver.ensureInitialized();
  }

  async ensureAssetDir(courseId: string, assetType: AssetType): Promise<string> {
    await this.ensureInitialized();
    const folderName = ASSET_FOLDERS[assetType];
    const fullDir = this.path.join(this.assetsBaseDir!, String(courseId), folderName);
    if (!(await this.fs.exists(fullDir))) {
      await this.fs.mkdir(fullDir, { recursive: true });
    }
    return fullDir;
  }

  async ensureTempDir(courseId: string, assetId: string): Promise<string> {
    await this.ensureInitialized();
    const guidesDir = await this.ensureAssetDir(courseId, 'guide');
    const tempDir = this.path.join(guidesDir, `.temp_${assetId}`);
    if (!(await this.fs.exists(tempDir))) {
      await this.fs.mkdir(tempDir, { recursive: true });
    }
    return tempDir;
  }

  async removeTempDir(tempDir: string): Promise<void> {
    if (this.fs.rm) {
      await this.fs.rm(tempDir, { recursive: true, force: true });
    }
  }

  async assetExists(filePath: string): Promise<boolean> {
    await this.ensureInitialized();
    if (await this.fs.exists(filePath)) return true;
    return (await this.resolver!.resolveExistingPath(filePath)) !== null;
  }

  async findExistingAsset(courseId: string, assetType: AssetType, filename: string): Promise<string | null> {
    await this.ensureInitialized();
    return this.resolver!.findAsset(courseId, assetType, filename);
  }

  async verifyVideoIntegrity(videoPath: string): Promise<boolean> {
    await this.ensureInitialized();
    const actualPath = (await this.resolver!.resolveExistingPath(videoPath)) || videoPath;
    if (!(await this.fs.exists(actualPath))) return false;
    const stats = await this.fs.stat(actualPath);
    if (stats.size < 200000) return false;
    return true;
  }

  async writeTempImage(imagePath: string, buffer: Buffer): Promise<void> {
    await this.fs.writeFile(imagePath, buffer);
  }

  async getTempImageSize(imagePath: string): Promise<number> {
    if (!(await this.fs.exists(imagePath))) return 0;
    return (await this.fs.stat(imagePath)).size;
  }

  async buildPDFFromImages(sourceDir: string, outputPath: string, options: PDFOptions = { optimize: false, quality: 80 }): Promise<void> {
    const files = (await this.fs.readdir(sourceDir)).filter((f: string) => f.endsWith(".png")).sort();
    if (files.length === 0) {
      throw new Error("No hay imágenes para crear PDF");
    }

    const doc = new PDFDocument({ autoFirstPage: false });
    if (!this.fs.createWriteStream) {
      throw new Error("FileSystem does not support writing streams");
    }
    const stream = this.fs.createWriteStream(outputPath);
    if (!stream) {
      throw new Error("Failed to create write stream");
    }
    doc.pipe(stream as any);

    try {
      for (const file of files) {
        const imgPath = this.path.join(sourceDir, file);
        if (options.optimize) {
          const optBuffer = await sharp(await this.fs.readFile(imgPath)).jpeg({ quality: options.quality }).toBuffer();
          const meta = await sharp(optBuffer).metadata();
          doc.addPage({ size: [meta.width!, meta.height!], margin: 0 });
          doc.image(optBuffer, 0, 0, { width: meta.width, height: meta.height });
        } else {
          const imgBuffer = await this.fs.readFile(imgPath);
          const meta = await sharp(imgBuffer).metadata();
          doc.addPage({ size: [meta.width!, meta.height!], margin: 0 });
          doc.image(imgBuffer, 0, 0, { width: meta.width, height: meta.height });
        }
      }
      doc.end();
    } catch (e) {
      throw e;
    }

    return new Promise((resolve, reject) => {
      (stream as any).on("finish", () => resolve());
      (stream as any).on("error", (e: any) => reject(e));
    });
  }
}
