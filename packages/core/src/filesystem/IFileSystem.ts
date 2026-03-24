import { type MakeDirectoryOptions, type RmOptions } from "fs";

export interface FileStats {
  size: number;
  mtime?: Date;
  isDirectory(): boolean;
}

export interface IFileSystem {
  exists(p: string): Promise<boolean>;
  readFile(p: string): Promise<Buffer>;
  readFile(p: string, encoding: BufferEncoding): Promise<string>;
  writeFile(p: string, content: string | Buffer): Promise<void>;
  readdir(p: string): Promise<string[]>;
  mkdir(p: string, options?: MakeDirectoryOptions): Promise<void>;
  rm?(p: string, options?: RmOptions): Promise<void>;
  stat(p: string): Promise<FileStats>;
  unlink(p: string): Promise<void>;
  rename(oldPath: string, newPath: string): Promise<void>;
  createReadStream?(p: string, options?: any): NodeJS.ReadableStream | null;
  createWriteStream?(p: string, options?: any): NodeJS.WritableStream | null;
}
