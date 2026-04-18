export interface IAuthSessionStorage {
  getAuthFile(): Promise<string>;
  getCookiesFile(): Promise<string>;
  saveCookies(cookies: any[]): Promise<void>;
  getCookies(): Promise<any[]>;
  ensureAuthDir(): Promise<void>;
  getStorageVersion(): Promise<number>;
}
