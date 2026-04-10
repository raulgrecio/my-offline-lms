import type { APIRoute } from 'astro';

import { ScraperService } from '@scraper/ScraperService';
import { logger } from '@web/platform/logging';

export const GET: APIRoute = async () => {
  try {
    const scraper = await ScraperService.create();
    const data = await scraper.getAvailableContent();

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    logger.error('[API Available Error]:', err);
    return new Response(JSON.stringify({ error: 'Failed to fetch available content' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
