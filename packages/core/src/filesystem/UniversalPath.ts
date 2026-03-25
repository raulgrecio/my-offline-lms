import { type IPath } from "./IPath";
import { type FileSystemProtocol } from "./UniversalFileSystem";

export class UniversalPath implements IPath {
  constructor(
    private localPath: IPath,
    private remotes: Map<FileSystemProtocol, IPath> = new Map()
  ) { }

  private getPathImpl(p: string): IPath {
    const proto = this.getProtocol(p);
    if (proto) {
      return this.remotes.get(proto) || this.localPath;
    }
    return this.localPath;
  }

  private getProtocol(p: string): FileSystemProtocol | null {
    const match = p.match(/^([a-z0-9]+):\/\//i);
    if (!match) return null;
    const proto = match[1].toLowerCase() as FileSystemProtocol;
    if (proto === ("https" as any)) return "http" as FileSystemProtocol;
    return proto;
  }

  resolve(...paths: string[]): string {
    return this.getPathImpl(paths[0] || "").resolve(...paths);
  }

  join(...paths: string[]): string {
    return this.getPathImpl(paths[0] || "").join(...paths);
  }

  isAbsolute(p: string): boolean {
    if (this.getProtocol(p)) return true;
    // Check for Windows drive letter like C:\ or UNC path like \\ or //
    if (/^[a-zA-Z]:[\\\/]/.test(p) || p.startsWith("\\\\") || p.startsWith("//")) return true;
    return this.localPath.isAbsolute(p);
  }

  dirname(p: string): string {
    return this.getPathImpl(p).dirname(p);
  }

  extname(p: string): string {
    return this.getPathImpl(p).extname(p);
  }

  get sep(): string {
    // This is tricky for UniversalPath. Default to local separator.
    return this.localPath.sep;
  }
}
