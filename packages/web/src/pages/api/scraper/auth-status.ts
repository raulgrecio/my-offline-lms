import type { APIRoute } from 'astro';

import { ScraperService } from '@scraper/ScraperService';

export const GET: APIRoute = async () => {
  try {
    const scraper = new ScraperService();
    // The ScraperService.init() method will trigger the validation check if we wrap it
    // Or we can just use the internal authSession directly.
    // Let's create a dedicated method in ScraperService for this.

    const status = await scraper.checkAuth();

    return new Response(JSON.stringify({
      isAuthenticated: status,
      message: status ? 'Sesión de Oracle válida' : 'No se detectó sesión'
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
