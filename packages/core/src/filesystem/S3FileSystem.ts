import { IFileSystem, FileStats } from "./IFileSystem";
import { ILogger, NoopLogger } from "../logging";

export class S3FileSystem implements IFileSystem {
  private logger: ILogger;

  constructor(private readonly bucket: string, logger: ILogger = new NoopLogger()) {
    this.logger = logger.withContext("S3FileSystem");
  }

  async exists(p: string): Promise<boolean> {
    this.logger.info(`Checking existence (Mocked as true) for ${p} in bucket ${this.bucket}`);
    return true; 
  }

  async readFile(p: string): Promise<Buffer>;
  async readFile(p: string, encoding: "utf-8"): Promise<string>;
  async readFile(p: string, encoding?: "utf-8"): Promise<string | Buffer> {
    this.logger.warn(`readFile not fully implemented for ${p}`);
    if (encoding === "utf-8") return "";
    return Buffer.alloc(0);
  }

  async writeFile(p: string, content: string | Buffer): Promise<void> {
    throw new Error(`[S3FileSystem] writeFile not implemented for ${p}`);
  }

  resolve(...paths: string[]): string {
    return paths.join("/");
  }

  join(...paths: string[]): string {
    return paths.join("/");
  }

  isAbsolute(p: string): boolean {
    return p.startsWith("s3://");
  }

  dirname(p: string): string {
    const parts = p.split("/");
    parts.pop();
    return parts.join("/");
  }

  async readdir(p: string): Promise<string[]> {
    throw new Error(`[S3FileSystem] readdir not implemented for ${p}`);
  }

  async mkdir(p: string, options?: { recursive?: boolean }): Promise<void> {
    throw new Error(`[S3FileSystem] mkdir not implemented for ${p}`);
  }

  async rm(p: string, options?: { recursive?: boolean; force?: boolean }): Promise<void> {
    throw new Error(`[S3FileSystem] rm not implemented for ${p}`);
  }

  async stat(p: string): Promise<FileStats> {
    return {
      size: 0,
      mtime: new Date(),
      isDirectory: () => false,
    };
  }

  createReadStream(p: string, options?: any): any {
    this.logger.warn(`createReadStream not fully implemented for ${p}`);
    return null;
  }

  createWriteStream(p: string): any {
    this.logger.warn(`createWriteStream not fully implemented for ${p}`);
    return null;
  }

  get sep(): string {
    return "/";
  }
}
