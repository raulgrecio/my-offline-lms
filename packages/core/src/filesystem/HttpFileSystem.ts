import type { MakeDirectoryOptions } from "fs";

import { type ILogger, NoopLogger } from "../logging";
import type { FileStats, IFileSystem } from "./IFileSystem";

export class HttpFileSystem implements IFileSystem {
  private logger: ILogger;

  constructor(logger: ILogger = new NoopLogger()) {
    this.logger = logger.withContext("HttpFileSystem");
  }

  async exists(p: string): Promise<boolean> {
    this.logger.info(`Checking existence (Mocked as true) for ${p}`);
    return true;
  }

  async readFile(p: string): Promise<Buffer>;
  async readFile(p: string, encoding: BufferEncoding): Promise<string>;
  async readFile(p: string, encoding?: BufferEncoding): Promise<string | Buffer> {
    // In a real implementation: GET request
    this.logger.warn(`readFile not fully implemented for ${p}`);
    return encoding ? "" : Buffer.alloc(0);
  }

  async writeFile(p: string, content: string | Buffer): Promise<void> {
    throw new Error("HttpFileSystem does not support writeFile");
  }

  async readdir(p: string): Promise<string[]> {
    throw new Error("HttpFileSystem does not support readdir");
  }

  async mkdir(p: string, options?: MakeDirectoryOptions): Promise<void> {
    throw new Error("HttpFileSystem does not support mkdir");
  }

  async stat(p: string): Promise<FileStats> {
    // Mocked stats
    return {
      size: 0,
      isDirectory: () => false,
    };
  }

  async unlink(p: string): Promise<void> {
    throw new Error("HttpFileSystem does not support unlink");
  }

  async rename(oldPath: string, newPath: string): Promise<void> {
    throw new Error("HttpFileSystem does not support rename");
  }

  createReadStream(p: string, options?: any): ReadableStream | null {
    this.logger.warn(`createReadStream not fully implemented for ${p}`);
    return null;
  }

  createWriteStream(p: string, options?: any): WritableStream | null {
    this.logger.warn(`createWriteStream not fully implemented for ${p}`);
    return null;
  }
}
