import fs from "fs";
import path from "path";

import { IAuthSessionStorage } from "@features/auth-session/domain/ports/IAuthSessionStorage";
import { getAuthDir } from "@config/paths";

export class DiskAuthSessionStorage implements IAuthSessionStorage {
  private authDir: string | undefined;
  private authFile: string | undefined;
  private cookiesFile: string | undefined;
  private baseDirArg?: string;

  constructor(baseDir?: string) {
    this.baseDirArg = baseDir;
  }

  private async ensureInitialized(): Promise<void> {
    if (this.authDir) return;
    this.authDir = this.baseDirArg || (await getAuthDir());
    this.authFile = path.join(this.authDir, "state.json");
    this.cookiesFile = path.join(this.authDir, "cookies.txt");
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
    await fs.promises.mkdir(this.authDir!, { recursive: true });
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

    await fs.promises.writeFile(
      this.cookiesFile!,
      `# Netscape HTTP Cookie File\n# http://curl.haxx.se/rfc/cookie_spec.html\n# This is a generated file!  Do not edit.\n\n${cookiesStr}\n`,
    );
  }
}
