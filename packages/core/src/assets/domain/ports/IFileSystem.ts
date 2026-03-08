export interface IFileSystem {
  existsSync(p: string): boolean;
  readFileSync(p: string, encoding: "utf-8"): string;
  writeFileSync(p: string, content: string): void;
  resolve(...paths: string[]): string;
  join(...paths: string[]): string;
  isAbsolute(p: string): boolean;
  dirname(p: string): string;
  readdirSync(p: string): string[];
  sep: string;
}
