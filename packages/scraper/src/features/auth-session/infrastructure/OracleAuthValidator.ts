import type { IAuthValidator } from "../domain/ports/IAuthValidator";

export class OracleAuthValidator implements IAuthValidator {
  private readonly criticalCookies = [
    'ora_session',
    'authToken',
    'OAMAuthnCookie',
    'ORA_U_SESSION'
  ];

  isValid(cookies: any[]): boolean {
    if (!cookies || cookies.length === 0) return false;

    const now = Date.now() / 1000;

    // 1. Verificar si existe el authToken (esencial para el scraper)
    const authToken = cookies.find(c => c.name === 'authToken');
    if (!authToken) return false;

    // Verificar que el token no pertenezca a un usuario Guest (sesión anónima)
    try {
      const parts = authToken.value.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        if (payload.email === 'my.learn.guest@oracle.com' || payload.firstName === 'Guest') {
          return false;
        }
      }
    } catch {
      // Ignoramos errores de parseo por resiliencia
    }

    // 2. Verificar que al menos existe alguna cookie de sesión funcional activa
    // Oracle usa ora_session u OAMAuthnCookie para mantener el estado del navegador.
    // Si estas existen y no han expirado, la sesión suele ser funcional.
    const hasActiveSessionCookie = cookies.some(c =>
      ['ora_session', 'OAMAuthnCookie', 'ORA_U_SESSION'].includes(c.name) &&
      (c.expires <= 0 || c.expires > now)
    );

    // Consideramos la sesión válida si tiene el token y alguna cookie de sesión activa.
    // Ignoramos la expiración interna del JWT para el retorno de isValid, ya que puede 
    // ser un falso negativo (el navegador a veces funciona con tokens "expirados" que se refrescan).
    return hasActiveSessionCookie;
  }

  getExpiry(cookies: any[]): number | null {
    if (!cookies) return null;

    const now = Date.now() / 1000;

    // Recopilar todas las expiraciones futuras
    const expiries = cookies
      .filter(c => (this.criticalCookies.includes(c.name) || c.name.startsWith('GP_AUTH_')) && c.expires > now)
      .map(c => c.expires);

    // Considerar la expiración del JWT solo si es en el futuro
    const authToken = cookies.find(c => c.name === 'authToken');
    if (authToken) {
      const jwtExp = this.getJwtExpiry(authToken.value);
      if (jwtExp && jwtExp > now) {
        expiries.push(jwtExp);
      }
    }

    return expiries.length > 0 ? Math.min(...expiries) : null;
  }

  private isJwtExpired(token: string): boolean {
    const exp = this.getJwtExpiry(token);
    if (!exp) return false;
    return exp <= (Date.now() / 1000);
  }

  private getJwtExpiry(token: string): number | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      return payload.exp || null;
    } catch {
      return null;
    }
  }
}
