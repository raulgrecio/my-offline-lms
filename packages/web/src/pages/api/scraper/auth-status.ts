import type { APIRoute } from 'astro';

import { ScraperService } from '@scraper/ScraperService';

export const GET: APIRoute = async () => {
  try {
    const scraper = await ScraperService.create();
    // The ScraperService.init() method will trigger the validation check if we wrap it
    // Or we can just use the internal authSession directly.
    // Let's create a dedicated method in ScraperService for this.

    const isAuthenticated = await scraper.validateAuth();
    const isLoggingIn = scraper.isLoggingIn;
    const expiresAt = isAuthenticated ? await scraper.getSessionExpiry() : null;

    return new Response(JSON.stringify({
      isAuthenticated,
      isLoggingIn,
      expiresAt,
      message: isAuthenticated ? 'Sesión de Oracle válida' : (isLoggingIn ? 'Esperando login en el navegador...' : 'No se detectó sesión')
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
