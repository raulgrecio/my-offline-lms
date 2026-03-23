import PDFDocument from "pdfkit";
import sharp from "sharp";
import { type IFileSystem } from "@my-offline-lms/core/filesystem";
import { type AssetType, ASSET_FOLDERS } from "@my-offline-lms/core/models";
import { AssetPathResolver, NodeFileSystem } from '@my-offline-lms/core/filesystem';
import { type ILogger } from "@my-offline-lms/core/logging";


import { getAssetPathsConfig, getAssetsDir, getMonorepoRoot } from "@config/paths";
import { IAssetStorage, PDFOptions } from "@features/asset-download/domain/ports/IAssetStorage";

export class DiskAssetStorage implements IAssetStorage {
  private assetsBaseDir: string | undefined;
  private resolver: AssetPathResolver | undefined;
  private fs: IFileSystem;
  private baseDirArg?: string;

  constructor(baseDir?: string, fsAdapter?: IFileSystem) {
    this.fs = fsAdapter || new NodeFileSystem();
    this.baseDirArg = baseDir;
  }

  private async ensureInitialized(): Promise<void> {
    if (this.assetsBaseDir && this.resolver) return;

    this.assetsBaseDir = this.baseDirArg || (await getAssetsDir());
    this.resolver = new AssetPathResolver({
      configPath: await getAssetPathsConfig(),
      monorepoRoot: await getMonorepoRoot(),
      fs: this.fs,
    });
    await this.resolver.ensureInitialized();
  }

  async ensureAssetDir(courseId: string, assetType: AssetType): Promise<string> {
    await this.ensureInitialized();
    const folderName = ASSET_FOLDERS[assetType];
    const dir = this.fs.join(this.assetsBaseDir!, String(courseId), folderName);
    if (!(await this.fs.exists(dir))) {
      await this.fs.mkdir(dir, { recursive: true });
    }
    return dir;
  }

  async ensureTempDir(courseId: string, assetId: string): Promise<string> {
    const guidesDir = await this.ensureAssetDir(courseId, 'guide');
    const tempDir = this.fs.join(guidesDir, `temp_${assetId}`);
    if (!(await this.fs.exists(tempDir))) {
      await this.fs.mkdir(tempDir, { recursive: true });
    }
    return tempDir;
  }

  async removeTempDir(tempDir: string): Promise<void> {
    if ((await this.fs.exists(tempDir)) && this.fs.rm) {
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
    doc.pipe(stream);

    try {
      for (const file of files) {
        const imgPath = this.fs.join(sourceDir, file);
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
      stream.on("finish", () => resolve());
      stream.on("error", (e: any) => reject(e));
    });
  }
}
