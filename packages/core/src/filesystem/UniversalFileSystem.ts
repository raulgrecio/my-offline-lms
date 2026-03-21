import path from "path";
import type { IFileSystem, FileStats } from "./IFileSystem";

export type FileSystemProtocol = "http" | "tcp" | "s3" | "blob";

/**
 * UniversalFileSystem selects the appropriate file system implementation
 * based on the path format or protocol.
 */
export class UniversalFileSystem implements IFileSystem {
  private localFs: IFileSystem;
  private remotes: Map<FileSystemProtocol, IFileSystem> = new Map();

  constructor(defaultLocalFs: IFileSystem) {
    this.localFs = defaultLocalFs;
  }

  registerRemote(protocol: FileSystemProtocol, fs: IFileSystem) {
    this.remotes.set(protocol, fs);
  }

  private getBackend(p: string): IFileSystem {
    if (p.startsWith("http://") || p.startsWith("https://")) {
      return this.remotes.get("http") || this.localFs;
    }
    if (p.startsWith("tcp://")) return this.remotes.get("tcp") || this.localFs;
    if (p.startsWith("s3://")) return this.remotes.get("s3") || this.localFs;
    if (p.startsWith("blob://")) return this.remotes.get("blob") || this.localFs;
    
    return this.localFs;
  }

  existsSync(p: string): boolean {
    return this.getBackend(p).existsSync(p);
  }

  readFileSync(p: string): Buffer;
  readFileSync(p: string, encoding: "utf-8"): string;
  readFileSync(p: string, encoding?: "utf-8"): string | Buffer {
    if (encoding === "utf-8") {
      return this.getBackend(p).readFileSync(p, encoding);
    }
    return this.getBackend(p).readFileSync(p);
  }

  writeFileSync(p: string, content: string | Buffer): void {
    return this.getBackend(p).writeFileSync(p, content);
  }

  resolve(...paths: string[]): string {
    // Resolve usually happens on the first path's backend
    return this.getBackend(paths[0] || "").resolve(...paths);
  }

  join(...paths: string[]): string {
    // Join should be careful with mixing protocols, but usually we join relative parts to a base
    return this.getBackend(paths[0] || "").join(...paths);
  }

  isAbsolute(p: string): boolean {
    if (p.startsWith("http://") || p.startsWith("https://") || p.startsWith("tcp://")) return true;
    
    // Check for Windows drive letter like C:\ or UNC path like \\
    if (/^[a-zA-Z]:[\\\/]/.test(p) || p.startsWith("\\\\")) return true;
    
    return path.isAbsolute(p);
  }

  dirname(p: string): string {
    return this.getBackend(p).dirname(p);
  }

  readdirSync(p: string): string[] {
    return this.getBackend(p).readdirSync(p);
  }

  mkdirSync(p: string, options?: { recursive?: boolean }): void {
    return this.getBackend(p).mkdirSync(p, options);
  }

  rmSync(p: string, options?: { recursive?: boolean; force?: boolean }): void {
    const backend = this.getBackend(p);
    if (backend.rmSync) {
      backend.rmSync(p, options);
    }
  }

  statSync(p: string): FileStats {
    return this.getBackend(p).statSync(p);
  }

  createReadStream(p: string, options?: any): any {
    const backend = this.getBackend(p);
    return backend.createReadStream ? backend.createReadStream(p, options) : null;
  }

  createWriteStream(p: string): any {
    const backend = this.getBackend(p);
    return backend.createWriteStream ? backend.createWriteStream(p) : null;
  }

  get sep(): string {
    // This is tricky for Universal. Defaulting to local platform sep for now.
    // In a more complex scenario, this would be backend-specific.
    return path.sep;
  }
}
