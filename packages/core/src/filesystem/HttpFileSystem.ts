import type { IFileSystem, FileStats } from "./IFileSystem";
import { ILogger, NoopLogger } from "../logging";

export class HttpFileSystem implements IFileSystem {
  private logger: ILogger;

  constructor(logger: ILogger = new NoopLogger()) {
    this.logger = logger.withContext("HttpFileSystem");
  }

  existsSync(p: string): boolean {
    this.logger.info(`Checking existence (Mocked as true) for ${p}`);
    return true; 
  }

  readFileSync(p: string): Buffer;
  readFileSync(p: string, encoding: "utf-8"): string;
  readFileSync(p: string, encoding?: "utf-8"): string | Buffer {
    // In a real implementation: GET request
    this.logger.warn(`readFileSync not fully implemented for ${p}`);
    return encoding === "utf-8" ? "" : Buffer.alloc(0);
  }

  writeFileSync(p: string, content: string | Buffer): void {
    throw new Error("HttpFileSystem does not support writeFileSync");
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

  readdirSync(p: string): string[] {
    throw new Error("HttpFileSystem does not support readdirSync");
  }

  mkdirSync(p: string, options?: { recursive?: boolean }): void {
    throw new Error("HttpFileSystem does not support mkdirSync");
  }

  statSync(p: string): FileStats {
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
