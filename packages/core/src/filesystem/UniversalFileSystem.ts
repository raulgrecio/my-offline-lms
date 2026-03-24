import { type MakeDirectoryOptions, type RmOptions } from "fs";
import type { FileStats, IFileSystem } from "./IFileSystem";
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
  async readFile(p: string, encoding: BufferEncoding): Promise<string>;
  async readFile(p: string, encoding?: BufferEncoding): Promise<string | Buffer> {
    if (encoding) {
      return this.getBackend(p).readFile(p, encoding);
    }
    return this.getBackend(p).readFile(p);
  }

  async writeFile(p: string, content: string | Buffer): Promise<void> {
    return this.getBackend(p).writeFile(p, content);
  }

  async readdir(p: string): Promise<string[]> {
    return this.getBackend(p).readdir(p);
  }

  async mkdir(p: string, options?: MakeDirectoryOptions): Promise<void> {
    return this.getBackend(p).mkdir(p, options);
  }

  async rm(p: string, options?: RmOptions): Promise<void> {
    const backend = this.getBackend(p);
    if (backend.rm) {
      await backend.rm(p, options);
    }
  }

  async stat(p: string): Promise<FileStats> {
    return this.getBackend(p).stat(p);
  }

  async unlink(p: string): Promise<void> {
    return this.getBackend(p).unlink(p);
  }

  async rename(oldPath: string, newPath: string): Promise<void> {
    return this.getBackend(oldPath).rename(oldPath, newPath);
  }

  createReadStream(p: string, options?: any): NodeJS.ReadableStream | null {
    const backend = this.getBackend(p);
    return backend.createReadStream ? backend.createReadStream(p, options) : null;
  }

  createWriteStream(p: string, options?: any): NodeJS.WritableStream | null {
    const backend = this.getBackend(p);
    return backend.createWriteStream ? backend.createWriteStream(p, options) : null;
  }
}
