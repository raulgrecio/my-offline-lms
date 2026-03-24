export interface IPath {
  resolve(...paths: string[]): string;
  join(...paths: string[]): string;
  isAbsolute(p: string): boolean;
  dirname(p: string): string;
  extname(p: string): string;
  sep: string;
}