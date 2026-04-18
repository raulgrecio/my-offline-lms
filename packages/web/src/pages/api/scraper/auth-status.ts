import type { APIRoute } from 'astro';

import { ScraperService } from '@scraper/ScraperService';
import { logger } from '@web/platform/logging';

export const GET: APIRoute = async ({ request }) => {
  try {
    const scraper = await ScraperService.create();
    const url = new URL(request.url);
    const force = url.searchParams.get('deep') === 'true' || url.searchParams.get('force') === 'true';

    const isAuthenticated = await scraper.validateAuth({ force });
    const isLoggingIn = scraper.isLoggingIn;
    const isLoginDetected = scraper.isLoginDetected;
    const sessionExpiry = await scraper.getSessionExpiry();
    const expiresAt = isAuthenticated ? sessionExpiry : null;

    // logger.debug(`[API/AuthStatus] isAuthenticated: ${isAuthenticated}`);
    // logger.debug(`[API/AuthStatus] isLoggingIn: ${isLoggingIn}`);
    // logger.debug(`[API/AuthStatus] isLoginDetected: ${isLoginDetected}`);
    // logger.debug(`[API/AuthStatus] sessionExpiry: ${sessionExpiry}`);
    // logger.debug(`[API/AuthStatus] expiresAt: ${expiresAt}`);

    return new Response(JSON.stringify({
      isAuthenticated,
      isLoggingIn,
      isLoginDetected,
      expiresAt,
      message: isAuthenticated ? 'Sesión válida' : (isLoggingIn ? 'Esperando login en el navegador...' : 'No se detectó sesión')
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ isAuthenticated: false, error: 'Error checking auth' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
