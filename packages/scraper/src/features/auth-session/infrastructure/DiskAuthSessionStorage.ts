import { type IFileSystem, type IPath } from "@core/filesystem";

import { type IAuthSessionStorage } from "../domain/ports/IAuthSessionStorage";

export class DiskAuthSessionStorage implements IAuthSessionStorage {
  private authDir?: string;
  private authFile?: string;
  private cookiesFile?: string;
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

  async getCookies(): Promise<any[]> {
    const authFile = await this.getAuthFile();
    try {
      const content = await this.fs.readFile(authFile);
      const state = JSON.parse(content.toString());
      return Array.isArray(state.cookies) ? state.cookies : [];
    } catch {
      // Si no existe o falla la lectura, devolvemos array vacío
      return [];
    }
  }


  async saveCookies(cookies: any[]): Promise<void> {
    await this.ensureInitialized();
    await this.ensureAuthDir();

    // 1. Guardar en formato JSON (Playwright storageState)
    // Intentar leer el estado actual para preservar localStorage si existe
    let state: any = { cookies: [], origins: [] };
    try {
      const content = await this.fs.readFile(this.authFile!);
      state = JSON.parse(content.toString());
    } catch {
      // Si falla la lectura (archivo no existe o corrupto), empezamos de cero
    }

    state.cookies = cookies;
    await this.fs.writeFile(this.authFile!, JSON.stringify(state, null, 2));

    // 2. Guardar en formato Netscape (cookies.txt) para compatibilidad
    const cookiesStr = cookies
      .map((c: any) => {
        // Formato Netscape: si incluye subdominios, el dominio debe empezar con punto
        let domain = c.domain;
        const includeSubdomains = domain.startsWith('.') || (domain.split('.').length > 1);
        const includeSubdomainsStr = includeSubdomains ? "TRUE" : "FALSE";
        
        if (includeSubdomains && !domain.startsWith('.')) {
          domain = '.' + domain;
        }

        const expires = (c.expires && c.expires > 0) ? Math.round(c.expires) : 0;
        return `${domain}\t${includeSubdomainsStr}\t${c.path}\t${c.secure ? "TRUE" : "FALSE"}\t${expires}\t${c.name}\t${c.value}`;
      })
      .join("\n");

    const header = "# Netscape HTTP Cookie File\n# http://curl.haxx.se/rfc/cookie_spec.html\n# This is a generated file!  Do not edit.\n\n";
    await this.fs.writeFile(this.cookiesFile!, header + cookiesStr + "\n");
  }

  async getStorageVersion(): Promise<number> {
    await this.ensureInitialized();
    try {
      const stats = await this.fs.stat(this.authFile!);
      // @ts-ignore
      return stats.mtime?.getTime() || 0;
    } catch {
      return 0;
    }
  }
}
