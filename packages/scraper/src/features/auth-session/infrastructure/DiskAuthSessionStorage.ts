import fs from "fs";
import path from "path";

import { IAuthSessionStorage } from "@features/auth-session/domain/ports/IAuthSessionStorage";
import { AUTH_DIR } from "@config/paths";

export class DiskAuthSessionStorage implements IAuthSessionStorage {
  private authDir: string;
  private authFile: string;
  private cookiesFile: string;

  constructor(baseDir?: string) {
    this.authDir = baseDir || AUTH_DIR;
    this.authFile = path.join(this.authDir, "state.json");
    this.cookiesFile = path.join(this.authDir, "cookies.txt");
  }

  getAuthFile(): string {
    return this.authFile;
  }

  getCookiesFile(): string {
    return this.cookiesFile;
  }

  async ensureAuthDir(): Promise<void> {
    await fs.promises.mkdir(this.authDir, { recursive: true });
  }

  async saveCookies(cookies: any[]): Promise<void> {
    await this.ensureAuthDir();
    const cookiesStr = cookies
      .map((c: any) => {
        const includeSubdomains = c.domain.startsWith('.') ? "TRUE" : "FALSE";
        const expires = (c.expires && c.expires > 0) ? Math.round(c.expires) : 0;
        return `${c.domain}\t${includeSubdomains}\t${c.path}\t${c.secure ? "TRUE" : "FALSE"}\t${expires}\t${c.name}\t${c.value}`;
      })
      .join("\n");

    await fs.promises.writeFile(
      this.cookiesFile,
      `# Netscape HTTP Cookie File\n# http://curl.haxx.se/rfc/cookie_spec.html\n# This is a generated file!  Do not edit.\n\n${cookiesStr}\n`,
    );
  }
}
