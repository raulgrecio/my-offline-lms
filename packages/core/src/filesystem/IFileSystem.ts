export interface FileStats {
  size: number;
  mtime?: Date;
  isDirectory(): boolean;
}

export interface IFileSystem {
  exists(p: string): Promise<boolean>;
  readFile(p: string): Promise<Buffer>;
  readFile(p: string, encoding: "utf-8"): Promise<string>;
  writeFile(p: string, content: string | Buffer): Promise<void>;
  resolve(...paths: string[]): string;
  join(...paths: string[]): string;
  isAbsolute(p: string): boolean;
  dirname(p: string): string;
  readdir(p: string): Promise<string[]>;
  mkdir(p: string, options?: { recursive?: boolean }): Promise<void>;
  rm?(p: string, options?: { recursive?: boolean; force?: boolean }): Promise<void>;
  stat(p: string): Promise<FileStats>;
  createReadStream?(p: string, options?: any): any;
  createWriteStream?(p: string): any;
  sep: string;
}
