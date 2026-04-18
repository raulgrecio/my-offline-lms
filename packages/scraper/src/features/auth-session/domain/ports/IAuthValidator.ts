export interface IAuthValidator {
  isValid(cookies: any[]): boolean;
  validate(cookies: any[]): Promise<boolean>;
  getExpiry(cookies: any[]): number | null;
  isLoginPage(params: { url: string; title?: string; hasLoginText?: boolean }): boolean;
}
