import { PLATFORM } from "@scraper/config";
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

        // 1.1 Si el token está expirado por más de 1 hora, consideramos que la sesión estática no es fiable
        const jwtExp = payload.exp;
        if (jwtExp && (now - jwtExp) > 3600) {
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
    return hasActiveSessionCookie;
  }

  async validate(cookies: any[]): Promise<boolean> {
    if (!this.isValid(cookies)) return false;

    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');
    
    try {
      // Intentamos acceder a la home de la plataforma. 
      // Si nos redirige a /login o /idp, la sesión es inválida.
      const response = await fetch(PLATFORM.BASE_URL, {
        headers: {
          'Cookie': cookieHeader,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        redirect: 'manual'
      });

      // Redirección manual: comprobamos el Location
      if (response.status === 302 || response.status === 301) {
        const location = response.headers.get('location');
        if (location && (location.includes('/login') || location.includes('/idp/') || location.includes('sign-in'))) {
          return false;
        }
      }

      // Si es un 401 o 403, definitivamente no es válida
      if (response.status === 401 || response.status === 403) {
        return false;
      }

      // Si llegamos aquí y es 200, la sesión es muy probablemente válida
      return response.ok;
    } catch (err) {
      // En caso de error de red, asumimos la validez estática para no bloquear al usuario injustificadamente
      return true;
    }
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

  isLoginPage(params: { url: string; title?: string; hasLoginText?: boolean }): boolean {
    const { url, title, hasLoginText } = params;

    const lowerTitle = title?.toLowerCase() || '';

    return (
      url.includes('identity.oraclecloud.com') ||
      url.includes('/login') ||
      url.includes('/idp/') ||
      url.includes('error=unauthorized') ||
      lowerTitle.includes('oracle identity cloud service') ||
      lowerTitle.includes('sign in') ||
      !!hasLoginText
    );
  }
}
