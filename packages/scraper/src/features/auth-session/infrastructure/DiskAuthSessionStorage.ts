import { type IFileSystem, type IPath } from "@core/filesystem";

import { env, PLATFORM } from "@scraper/config";

import { type IAuthSessionStorage } from "../domain/ports/IAuthSessionStorage";

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

  async isValidSession(): Promise<boolean> {
    const authFile = await this.getAuthFile();

    try {
      if (!(await this.fs.exists(authFile))) return false;

      const content = await this.fs.readFile(authFile);
      const state = JSON.parse(content.toString());

      if (!state.cookies || !Array.isArray(state.cookies) || state.cookies.length === 0) {
        return false;
      }

      const now = Date.now() / 1000;
      const platformDomain = new URL(env.PLATFORM_BASE_URL).hostname;

      // Check localStorage for user profile (Guest vs Real)
      const hasRealUser = state.origins?.some((o: any) => 
        o.localStorage?.some((ls: any) => 
          ls.name === 'userProfile' && !ls.value.includes(PLATFORM.CONSTANTS.ORACLE.GUEST_EMAIL)
        )
      );

      // If we have a userProfile but it's a guest one, we are NOT authenticated
      if (hasRealUser === false && state.origins?.length > 0) return false;

      // Oracle specific session indicators in cookies
      const authCookieNames = [
        'ora_session',
        'authToken',
        'OAMAuthnCookie',
        'ORA_U_SESSION',
        'GP_PROD_SESSION',
        'SSO_TOKEN',
        'ORACLE_SESSION'
      ];

      return state.cookies.some((c: any) => {
        const isCorrectDomain = c.domain.includes(platformDomain) || platformDomain.includes(c.domain.replace(/^\./, ''));
        const isNotExpired = !c.expires || c.expires <= 0 || c.expires > now;
        const isAuthIndicator = authCookieNames.includes(c.name) || c.name.startsWith('GP_AUTH_');

        // Extra check: if it's authToken, it shouldn't contain "Guest" in its payload (if we want to be paranoid)
        // But the localStorage check above is already quite strong.
        
        return isCorrectDomain && isNotExpired && isAuthIndicator;
      });
    } catch {
      return false;
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
