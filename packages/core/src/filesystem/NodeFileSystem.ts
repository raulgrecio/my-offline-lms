import fs from "fs";
import path from "path";

import type { IFileSystem, FileStats } from "./IFileSystem";
import { type ILogger, NoopLogger } from "../logging";

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
  async readFile(p: string, encoding: "utf-8"): Promise<string>;
  async readFile(p: string, encoding?: "utf-8"): Promise<string | Buffer> {
    if (encoding === "utf-8") {
      return fs.promises.readFile(p, encoding);
    }
    return fs.promises.readFile(p);
  }

  async writeFile(p: string, content: string | Buffer): Promise<void> {
    this.logger.debug?.(`writeFile to ${p}`);
    await fs.promises.writeFile(p, content);
  }

  resolve(...paths: string[]): string {
    return path.resolve(...paths);
  }

  join(...paths: string[]): string {
    return path.join(...paths);
  }

  isAbsolute(p: string): boolean {
    return path.isAbsolute(p);
  }

  dirname(p: string): string {
    return path.dirname(p);
  }

  async readdir(p: string): Promise<string[]> {
    return fs.promises.readdir(p);
  }

  async mkdir(p: string, options?: { recursive?: boolean }): Promise<void> {
    await fs.promises.mkdir(p, options);
  }

  async rm(p: string, options?: { recursive?: boolean; force?: boolean }): Promise<void> {
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

  createReadStream(p: string, options?: any): fs.ReadStream {
    return fs.createReadStream(p, options);
  }

  createWriteStream(p: string): fs.WriteStream {
    return fs.createWriteStream(p);
  }

  get sep(): string {
    return path.sep;
  }
}
