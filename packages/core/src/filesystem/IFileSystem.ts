export interface FileStats {
  size: number;
  mtime?: Date;
  isDirectory(): boolean;
}

export interface IFileSystem {
  existsSync(p: string): boolean;
  readFileSync(p: string): Buffer;
  readFileSync(p: string, encoding: "utf-8"): string;
  writeFileSync(p: string, content: string | Buffer): void;
  resolve(...paths: string[]): string;
  join(...paths: string[]): string;
  isAbsolute(p: string): boolean;
  dirname(p: string): string;
  readdirSync(p: string): string[];
  mkdirSync(p: string, options?: { recursive?: boolean }): void;
  rmSync?(p: string, options?: { recursive?: boolean; force?: boolean }): void;
  statSync(p: string): FileStats;
  createReadStream?(p: string, options?: any): any;
  createWriteStream?(p: string): any;
  sep: string;
}
