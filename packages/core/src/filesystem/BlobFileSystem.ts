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

  async exists(p: string): Promise<boolean> {
    this.logger.info(`Checking existence (Mocked as true) for ${p} in ${this.account}/${this.container}`);
    return true; 
  }

  async readFile(p: string): Promise<Buffer>;
  async readFile(p: string, encoding: "utf-8"): Promise<string>;
  async readFile(p: string, encoding?: "utf-8"): Promise<string | Buffer> {
    this.logger.warn(`readFile not fully implemented for ${p}`);
    if (encoding === "utf-8") return "";
    return Buffer.alloc(0);
  }

  async writeFile(p: string, content: string | Buffer): Promise<void> {
    throw new Error(`[BlobFileSystem] writeFile not implemented for ${p}`);
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

  async readdir(p: string): Promise<string[]> {
    throw new Error(`[BlobFileSystem] readdir not implemented for ${p}`);
  }

  async mkdir(p: string, options?: { recursive?: boolean }): Promise<void> {
    throw new Error(`[BlobFileSystem] mkdir not implemented for ${p}`);
  }

  async rm(p: string, options?: { recursive?: boolean; force?: boolean }): Promise<void> {
    throw new Error(`[BlobFileSystem] rm not implemented for ${p}`);
  }

  async stat(p: string): Promise<FileStats> {
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
