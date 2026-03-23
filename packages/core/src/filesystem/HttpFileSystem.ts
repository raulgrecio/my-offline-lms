import type { IFileSystem, FileStats } from "./IFileSystem";
import { type ILogger, NoopLogger } from "../logging";

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
  async readFile(p: string, encoding: "utf-8"): Promise<string>;
  async readFile(p: string, encoding?: "utf-8"): Promise<string | Buffer> {
    // In a real implementation: GET request
    this.logger.warn(`readFile not fully implemented for ${p}`);
    return encoding === "utf-8" ? "" : Buffer.alloc(0);
  }

  async writeFile(p: string, content: string | Buffer): Promise<void> {
    throw new Error("HttpFileSystem does not support writeFile");
  }

  resolve(...paths: string[]): string {
    return paths.join("/"); // Simple URL join
  }

  join(...paths: string[]): string {
    return paths.join("/");
  }

  isAbsolute(p: string): boolean {
    return p.startsWith("http://") || p.startsWith("https://");
  }

  dirname(p: string): string {
    const url = new URL(p);
    const parts = url.pathname.split("/");
    parts.pop();
    url.pathname = parts.join("/");
    return url.toString();
  }

  async readdir(p: string): Promise<string[]> {
    throw new Error("HttpFileSystem does not support readdir");
  }

  async mkdir(p: string, options?: { recursive?: boolean }): Promise<void> {
    throw new Error("HttpFileSystem does not support mkdir");
  }

  async stat(p: string): Promise<FileStats> {
    // Mocked stats
    return {
      size: 0,
      isDirectory: () => false,
    };
  }

  get sep(): string {
    return "/";
  }
}
