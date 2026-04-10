import { type MakeDirectoryOptions, type RmOptions } from "node:fs";
import { Readable, Writable } from "node:stream";

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
  appendFile(p: string, content: string | Buffer): Promise<void>;
  readdir(p: string): Promise<string[]>;
  mkdir(p: string, options?: MakeDirectoryOptions): Promise<void>;
  rm?(p: string, options?: RmOptions): Promise<void>;
  stat(p: string): Promise<FileStats>;
  unlink(p: string): Promise<void>;
  rename(oldPath: string, newPath: string): Promise<void>;
  createReadStream(p: string, options?: any): ReadableStream | null;
  createWriteStream(p: string, options?: any): WritableStream | null;
}
