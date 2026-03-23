import path from "path";
import type { IFileSystem, FileStats } from "./IFileSystem";
import { type ILogger, NoopLogger } from "../logging";

export type FileSystemProtocol = "http" | "tcp" | "s3" | "blob";

const SUPPORTED_PROTOCOLS: FileSystemProtocol[] = ["http", "tcp", "s3", "blob"];

/**
 * UniversalFileSystem selecciona la implementación de sistema de archivos adecuada
 * basándose en el formato de la ruta o el protocolo.
 */
export class UniversalFileSystem implements IFileSystem {
  private localFs: IFileSystem;
  private remotes: Map<FileSystemProtocol, IFileSystem> = new Map();
  private logger: ILogger;

  constructor(defaultLocalFs: IFileSystem, logger: ILogger = new NoopLogger()) {
    this.localFs = defaultLocalFs;
    this.logger = logger.withContext("UniversalFileSystem");
  }

  registerRemote(protocol: FileSystemProtocol, fs: IFileSystem) {
    this.remotes.set(protocol, fs);
  }

  private getBackend(p: string): IFileSystem {
    const proto = this.getProtocol(p);
    if (proto) {
      const b = this.remotes.get(proto) || this.localFs;
      if (b === this.localFs) {
        this.logger.debug?.(`No remote for ${proto}, using local for ${p}`);
      }
      return b;
    }
    return this.localFs;
  }

  private getProtocol(p: string): FileSystemProtocol | null {
    const match = p.match(/^([a-z0-9]+):\/\//i);
    if (!match) return null;
    const proto = match[1].toLowerCase();
    if (proto === "https") return "http";
    // Check if it's one of our supported protocols
    return SUPPORTED_PROTOCOLS.includes(proto as any) ? (proto as FileSystemProtocol) : null;
  }

  async exists(p: string): Promise<boolean> {
    return this.getBackend(p).exists(p);
  }

  async readFile(p: string): Promise<Buffer>;
  async readFile(p: string, encoding: "utf-8"): Promise<string>;
  async readFile(p: string, encoding?: "utf-8"): Promise<string | Buffer> {
    if (encoding === "utf-8") {
      return this.getBackend(p).readFile(p, encoding);
    }
    return this.getBackend(p).readFile(p);
  }

  async writeFile(p: string, content: string | Buffer): Promise<void> {
    return this.getBackend(p).writeFile(p, content);
  }

  resolve(...paths: string[]): string {
    return this.getBackend(paths[0] || "").resolve(...paths);
  }

  join(...paths: string[]): string {
    return this.getBackend(paths[0] || "").join(...paths);
  }

  isAbsolute(p: string): boolean {
    if (this.getProtocol(p)) return true;

    // Check for Windows drive letter like C:\ or UNC path like \\ or //
    if (/^[a-zA-Z]:[\\\/]/.test(p) || p.startsWith("\\\\") || p.startsWith("//")) return true;

    return path.isAbsolute(p);
  }

  dirname(p: string): string {
    return this.getBackend(p).dirname(p);
  }

  async readdir(p: string): Promise<string[]> {
    return this.getBackend(p).readdir(p);
  }

  async mkdir(p: string, options?: { recursive?: boolean }): Promise<void> {
    return this.getBackend(p).mkdir(p, options);
  }

  async rm(p: string, options?: { recursive?: boolean; force?: boolean }): Promise<void> {
    const backend = this.getBackend(p);
    if (backend.rm) {
      await backend.rm(p, options);
    }
  }

  async stat(p: string): Promise<FileStats> {
    return this.getBackend(p).stat(p);
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
    return path.sep;
  }
}
