import { type MakeDirectoryOptions, type RmOptions } from "fs";
import { type IFileSystem, type FileStats } from "./IFileSystem";
import { type ILogger, NoopLogger } from "../logging";

export class BlobFileSystem implements IFileSystem {
  private logger: ILogger;

  constructor(
    private readonly account: string,
    private readonly container: string,
    logger: ILogger = new NoopLogger()
  ) {
    this.logger = logger.withContext("BlobFileSystem");
  }

  async exists(p: string): Promise<boolean> {
    this.logger.info(`Checking existence (Mocked as true) for ${p} in ${this.account}/${this.container}`);
    return true;
  }

  async readFile(p: string): Promise<Buffer>;
  async readFile(p: string, encoding: BufferEncoding): Promise<string>;
  async readFile(p: string, encoding?: BufferEncoding): Promise<string | Buffer> {
    this.logger.warn(`readFile not fully implemented for ${p}`);
    if (encoding) return "";
    return Buffer.alloc(0);
  }

  async writeFile(p: string, content: string | Buffer): Promise<void> {
    throw new Error(`[BlobFileSystem] writeFile not implemented for ${p}`);
  }

  async readdir(p: string): Promise<string[]> {
    throw new Error(`[BlobFileSystem] readdir not implemented for ${p}`);
  }

  async mkdir(p: string, options?: MakeDirectoryOptions): Promise<void> {
    throw new Error(`[BlobFileSystem] mkdir not implemented for ${p}`);
  }

  async rm(p: string, options?: RmOptions): Promise<void> {
    throw new Error(`[BlobFileSystem] rm not implemented for ${p}`);
  }

  async stat(p: string): Promise<FileStats> {
    return {
      size: 0,
      mtime: new Date(),
      isDirectory: () => false,
    };
  }

  createReadStream(p: string, options?: any): NodeJS.ReadableStream | null {
    this.logger.warn(`createReadStream not fully implemented for ${p}`);
    return null;
  }

  createWriteStream(p: string, options?: any): NodeJS.WritableStream | null {
    this.logger.warn(`createWriteStream not fully implemented for ${p}`);
    return null;
  }

  async unlink(p: string): Promise<void> {
    throw new Error(`[BlobFileSystem] unlink not implemented for ${p}`);
  }

  async rename(oldPath: string, newPath: string): Promise<void> {
    throw new Error(`[BlobFileSystem] rename not implemented from ${oldPath} to ${newPath}`);
  }
}
