import path from "path";
import { type IPath } from "./IPath";

export class NodePath implements IPath {
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

  extname(p: string): string {
    return path.extname(p);
  }

  get sep(): string {
    return path.sep;
  }
}
