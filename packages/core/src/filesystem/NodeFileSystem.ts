import fs from "fs";
import path from "path";

import type { IFileSystem } from "./IFileSystem";

export class NodeFileSystem implements IFileSystem {
  existsSync(p: string): boolean {
    return fs.existsSync(p);
  }

  readFileSync(p: string, encoding: "utf-8"): string {
    return fs.readFileSync(p, encoding);
  }

  writeFileSync(p: string, content: string): void {
    fs.writeFileSync(p, content);
  }

  resolve(...paths: string[]): string {
    return path.resolve(...paths);
  }

  join(...paths: string[]): string {
    return path.join(...paths);
  }

  isAbsolute(p: string): boolean {
    return path.isAbsolute(p);
  }

  dirname(p: string): string {
    return path.dirname(p);
  }

  readdirSync(p: string): string[] {
    return fs.readdirSync(p);
  }

  get sep(): string {
    return path.sep;
  }
}
