import type { APIRoute } from 'astro';

import { ScraperService } from '@scraper/ScraperService';
import { logger } from '@web/platform/logging';

export const POST: APIRoute = async ({ request }) => {
  try {
    const scraper = await ScraperService.create();
    // We don't await the login completion because it's interactive and the browser needs to stay open
    // BUT we should avoid spawning multiple instances
    scraper.login({ interactive: false, headless: false }).catch((err: any) => {
      logger.error('Interactive login error:', err);
    });

    return new Response(JSON.stringify({
      ok: true,
      message: 'Ventana de login abierta en el servidor (Display Local).'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Failed to start interactive login' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
