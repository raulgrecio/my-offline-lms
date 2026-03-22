import fs from "fs";
import path from "path";

import type { IFileSystem, FileStats } from "./IFileSystem";
import { ILogger, NoopLogger } from "../logging";

export class NodeFileSystem implements IFileSystem {
  private logger: ILogger;

  constructor(logger: ILogger = new NoopLogger()) {
    this.logger = logger.withContext("NodeFileSystem");
  }

  existsSync(p: string): boolean {
    const exists = fs.existsSync(p);
    this.logger.debug?.(`existsSync check for ${p}: ${exists}`);
    return exists;
  }

  readFileSync(p: string): Buffer;
  readFileSync(p: string, encoding: "utf-8"): string;
  readFileSync(p: string, encoding?: "utf-8"): string | Buffer {
    if (encoding === "utf-8") {
      return fs.readFileSync(p, encoding);
    }
    return fs.readFileSync(p);
  }

  writeFileSync(p: string, content: string | Buffer): void {
    this.logger.debug?.(`writeFileSync to ${p}`);
    fs.writeFileSync(p, content);
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

  readdirSync(p: string): string[] {
    return fs.readdirSync(p);
  }

  mkdirSync(p: string, options?: { recursive?: boolean }): void {
    fs.mkdirSync(p, options);
  }

  rmSync(p: string, options?: { recursive?: boolean; force?: boolean }): void {
    fs.rmSync(p, options);
  }

  statSync(p: string): FileStats {
    const stats = fs.statSync(p);
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
