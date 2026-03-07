export interface IAuthSessionStorage {
  getAuthFile(): string;
  getCookiesFile(): string;
  saveCookies(cookies: any[]): void;
  ensureAuthDir(): void;
}
