export interface IAuthSessionStorage {
  getAuthFile(): Promise<string>;
  getCookiesFile(): Promise<string>;
  saveCookies(cookies: any[]): Promise<void>;
  ensureAuthDir(): Promise<void>;
  isValidSession(): Promise<boolean>;
  getSessionExpiry(): Promise<number | null>;
}
