import { type IPath } from "./IPath";

export class WebPath implements IPath {
  resolve(...paths: string[]): string {
    // For web/remote, resolve might just be join if there's no "current directory" concept
    // or it could be absolute URL resolution.
    // For now, mimicking existing behavior:
    return paths.join("/");
  }

  join(...paths: string[]): string {
    return paths.join("/");
  }

  isAbsolute(p: string): boolean {
    return p.includes("://") || p.startsWith("/");
  }

  dirname(p: string): string {
    const parts = p.split("/");
    if (parts.length <= 1) return p;
    parts.pop();
    return parts.join("/") || "/";
  }

  extname(p: string): string {
    const match = p.match(/\.[^/.]+$/);
    return match ? match[0] : "";
  }

  get sep(): string {
    return "/";
  }
}
