import type { IFileSystem, FileStats } from "./IFileSystem";
// Note: We would use a library like axios or cross-fetch here
// For demonstration, we'll use a simplified implementation or just placeholders
// In a real project, we'd add 'axios' or 'cross-fetch' to packages/core/package.json

export class HttpFileSystem implements IFileSystem {
  existsSync(p: string): boolean {
    // In a real implementation: HEAD request to check 200/404
    console.warn(`[HttpFileSystem] Checking existence of ${p} (Mocked as true)`);
    return true; 
  }

  readFileSync(p: string): Buffer;
  readFileSync(p: string, encoding: "utf-8"): string;
  readFileSync(p: string, encoding?: "utf-8"): string | Buffer {
    // In a real implementation: GET request
    console.error(`[HttpFileSystem] readFileSync not fully implemented for ${p}`);
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
