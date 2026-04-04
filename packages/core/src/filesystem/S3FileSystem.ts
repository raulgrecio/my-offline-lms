import { type MakeDirectoryOptions, type RmOptions } from "fs";

import { type ILogger, NoopLogger } from "../logging";
import type { FileStats, IFileSystem } from "./IFileSystem";

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
  async readFile(p: string, encoding: BufferEncoding): Promise<string>;
  async readFile(p: string, encoding?: BufferEncoding): Promise<string | Buffer> {
    this.logger.warn(`readFile not fully implemented for ${p}`);
    if (encoding) return "";
    return Buffer.alloc(0);
  }

  async writeFile(p: string, content: string | Buffer): Promise<void> {
    throw new Error(`[S3FileSystem] writeFile not implemented for ${p}`);
  }

  async appendFile(p: string, content: string | Buffer): Promise<void> {
    throw new Error(`[S3FileSystem] appendFile not implemented for ${p}`);
  }

  async readdir(p: string): Promise<string[]> {
    throw new Error(`[S3FileSystem] readdir not implemented for ${p}`);
  }

  async mkdir(p: string, options?: MakeDirectoryOptions): Promise<void> {
    throw new Error(`[S3FileSystem] mkdir not implemented for ${p}`);
  }

  async rm(p: string, options?: RmOptions): Promise<void> {
    throw new Error(`[S3FileSystem] rm not implemented for ${p}`);
  }

  async stat(p: string): Promise<FileStats> {
    return {
      size: 0,
      mtime: new Date(),
      isDirectory: () => false,
    };
  }

  createReadStream(p: string, options?: any): ReadableStream | null {
    this.logger.warn(`createReadStream not fully implemented for ${p}`);
    return null;
  }

  createWriteStream(p: string, options?: any): WritableStream | null {
    this.logger.warn(`createWriteStream not fully implemented for ${p}`);
    return null;
  }

  async unlink(p: string): Promise<void> {
    throw new Error(`[S3FileSystem] unlink not implemented for ${p}`);
  }

  async rename(oldPath: string, newPath: string): Promise<void> {
    throw new Error(`[S3FileSystem] rename not implemented from ${oldPath} to ${newPath}`);
  }
}
