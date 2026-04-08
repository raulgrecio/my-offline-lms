export interface IAuthValidator {
  isValid(cookies: any[]): boolean;
  getExpiry(cookies: any[]): number | null;
}
