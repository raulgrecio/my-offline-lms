import { IFileSystem, FileStats } from "./IFileSystem";
import { ILogger, NoopLogger } from "../logging";

export class BlobFileSystem implements IFileSystem {
  private logger: ILogger;

  constructor(
    private readonly account: string,
    private readonly container: string,
    logger: ILogger = new NoopLogger()
  ) {
    this.logger = logger.withContext("BlobFileSystem");
  }

  existsSync(p: string): boolean {
    this.logger.info(`Checking existence (Mocked as true) for ${p} in ${this.account}/${this.container}`);
    return true; 
  }

  readFileSync(p: string): Buffer;
  readFileSync(p: string, encoding: "utf-8"): string;
  readFileSync(p: string, encoding?: "utf-8"): string | Buffer {
    this.logger.warn(`readFileSync not fully implemented for ${p}`);
    if (encoding === "utf-8") return "";
    return Buffer.alloc(0);
  }

  writeFileSync(p: string, content: string | Buffer): void {
    throw new Error(`[BlobFileSystem] writeFileSync not implemented for ${p}`);
  }

  resolve(...paths: string[]): string {
    return paths.join("/");
  }

  join(...paths: string[]): string {
    return paths.join("/");
  }

  isAbsolute(p: string): boolean {
    return p.startsWith("blob://");
  }

  dirname(p: string): string {
    const parts = p.split("/");
    parts.pop();
    return parts.join("/");
  }

  readdirSync(p: string): string[] {
    throw new Error(`[BlobFileSystem] readdirSync not implemented for ${p}`);
  }

  mkdirSync(p: string, options?: { recursive?: boolean }): void {
    throw new Error(`[BlobFileSystem] mkdirSync not implemented for ${p}`);
  }

  rmSync(p: string, options?: { recursive?: boolean; force?: boolean }): void {
    throw new Error(`[BlobFileSystem] rmSync not implemented for ${p}`);
  }

  statSync(p: string): FileStats {
    return {
      size: 0,
      mtime: new Date(),
      isDirectory: () => false,
    };
  }

  createReadStream(p: string, options?: any): any {
    this.logger.warn(`createReadStream not fully implemented for ${p}`);
    return null;
  }

  createWriteStream(p: string): any {
    this.logger.warn(`createWriteStream not fully implemented for ${p}`);
    return null;
  }

  get sep(): string {
    return "/";
  }
}
