import { IFileSystem, FileStats } from "./IFileSystem";

export class S3FileSystem implements IFileSystem {
  existsSync(p: string): boolean {
    console.log(`[S3FileSystem] Checking existence of ${p} (Mocked as true)`);
    return true; 
  }

  readFileSync(p: string): Buffer;
  readFileSync(p: string, encoding: "utf-8"): string;
  readFileSync(p: string, encoding?: "utf-8"): string | Buffer {
    console.log(`[S3FileSystem] readFileSync not fully implemented for ${p}`);
    if (encoding === "utf-8") return "";
    return Buffer.alloc(0);
  }

  writeFileSync(p: string, content: string | Buffer): void {
    throw new Error(`[S3FileSystem] writeFileSync not implemented for ${p}`);
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

  readdirSync(p: string): string[] {
    throw new Error(`[S3FileSystem] readdirSync not implemented for ${p}`);
  }

  mkdirSync(p: string, options?: { recursive?: boolean }): void {
    throw new Error(`[S3FileSystem] mkdirSync not implemented for ${p}`);
  }

  rmSync(p: string, options?: { recursive?: boolean; force?: boolean }): void {
    throw new Error(`[S3FileSystem] rmSync not implemented for ${p}`);
  }

  statSync(p: string): FileStats {
    return {
      size: 0,
      mtime: new Date(),
      isDirectory: () => false,
    };
  }

  createReadStream(p: string, options?: any): any {
    console.log(`[S3FileSystem] createReadStream not fully implemented for ${p}`);
    return null;
  }

  createWriteStream(p: string): any {
    console.log(`[S3FileSystem] createWriteStream not fully implemented for ${p}`);
    return null;
  }

  get sep(): string {
    return "/";
  }
}
