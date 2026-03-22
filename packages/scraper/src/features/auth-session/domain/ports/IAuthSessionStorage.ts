export interface IAuthSessionStorage {
  getAuthFile(): string;
  getCookiesFile(): string;
  saveCookies(cookies: any[]): Promise<void>;
  ensureAuthDir(): Promise<void>;
}
