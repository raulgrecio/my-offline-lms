import { type IFileSystem, type IPath } from "@my-offline-lms/core/filesystem";
import { IAuthSessionStorage } from "@features/auth-session/domain/ports/IAuthSessionStorage";

export class DiskAuthSessionStorage implements IAuthSessionStorage {
  private authDir: string | undefined;
  private authFile: string | undefined;
  private cookiesFile: string | undefined;
  private baseDirArg?: string;
  private fs: IFileSystem;
  private path: IPath;
  private getAuthDirFn: () => Promise<string>;

  constructor(deps: { 
    fs: IFileSystem, 
    path: IPath, 
    getAuthDir: () => Promise<string>,
    baseDir?: string 
  }) {
    this.fs = deps.fs;
    this.path = deps.path;
    this.getAuthDirFn = deps.getAuthDir;
    this.baseDirArg = deps.baseDir;
  }

  private async ensureInitialized(): Promise<void> {
    if (this.authDir) return;
    this.authDir = this.baseDirArg || (await this.getAuthDirFn());
    this.authFile = this.path.join(this.authDir!, "state.json");
    this.cookiesFile = this.path.join(this.authDir!, "cookies.txt");
  }

  async getAuthFile(): Promise<string> {
    await this.ensureInitialized();
    return this.authFile!;
  }

  async getCookiesFile(): Promise<string> {
    await this.ensureInitialized();
    return this.cookiesFile!;
  }

  async ensureAuthDir(): Promise<void> {
    await this.ensureInitialized();
    if (!(await this.fs.exists(this.authDir!))) {
      await this.fs.mkdir(this.authDir!, { recursive: true });
    }
  }

  async saveCookies(cookies: any[]): Promise<void> {
    await this.ensureInitialized();
    await this.ensureAuthDir();
    const cookiesStr = cookies
      .map((c: any) => {
        const includeSubdomains = c.domain.startsWith('.') ? "TRUE" : "FALSE";
        const expires = (c.expires && c.expires > 0) ? Math.round(c.expires) : 0;
        return `${c.domain}\t${includeSubdomains}\t${c.path}\t${c.secure ? "TRUE" : "FALSE"}\t${expires}\t${c.name}\t${c.value}`;
      })
      .join("\n");

    await this.fs.writeFile(
      this.cookiesFile!,
      `# Netscape HTTP Cookie File\n# http://curl.haxx.se/rfc/cookie_spec.html\n# This is a generated file!  Do not edit.\n\n${cookiesStr}\n`,
    );
  }
}
