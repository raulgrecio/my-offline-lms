import fs from "node:fs";
import { type MakeDirectoryOptions, type RmOptions } from "node:fs";
import { Readable, Writable } from "node:stream";

import { type ILogger, NoopLogger } from "../logging";
import type { FileStats, IFileSystem } from "./IFileSystem";

export class NodeFileSystem implements IFileSystem {
  private logger: ILogger;

  constructor(logger: ILogger = new NoopLogger()) {
    this.logger = logger.withContext("NodeFileSystem");
  }

  async exists(p: string): Promise<boolean> {
    try {
      await fs.promises.access(p);
      this.logger.debug?.(`exists check for ${p}: true`);
      return true;
    } catch {
      this.logger.debug?.(`exists check for ${p}: false`);
      return false;
    }
  }

  async readFile(p: string): Promise<Buffer>;
  async readFile(p: string, encoding: BufferEncoding): Promise<string>;
  async readFile(p: string, encoding?: BufferEncoding): Promise<string | Buffer> {
    if (encoding) {
      return fs.promises.readFile(p, encoding);
    }
    return fs.promises.readFile(p);
  }

  async writeFile(p: string, content: string | Buffer): Promise<void> {
    this.logger.debug?.(`writeFile to ${p}`);
    await fs.promises.writeFile(p, content);
  }

  async readdir(p: string): Promise<string[]> {
    return fs.promises.readdir(p);
  }

  async mkdir(p: string, options?: MakeDirectoryOptions): Promise<void> {
    await fs.promises.mkdir(p, options);
  }

  async rm(p: string, options?: RmOptions): Promise<void> {
    await fs.promises.rm(p, options);
  }

  async stat(p: string): Promise<FileStats> {
    const stats = await fs.promises.stat(p);
    return {
      size: stats.size,
      mtime: stats.mtime,
      isDirectory: () => stats.isDirectory(),
    };
  }

  async unlink(p: string): Promise<void> {
    await fs.promises.unlink(p);
  }

  async rename(oldPath: string, newPath: string): Promise<void> {
    await fs.promises.rename(oldPath, newPath);
  }

  createReadStream(p: string, options?: any): ReadableStream | null {
    const nodeStream = fs.createReadStream(p, options);
    return Readable.toWeb ? (Readable.toWeb(nodeStream) as any as ReadableStream) : null;
  }

  createWriteStream(p: string, options?: any): WritableStream | null {
    const nodeStream = fs.createWriteStream(p, options);
    return Writable.toWeb ? (Writable.toWeb(nodeStream) as any as WritableStream) : null;
  }
}
