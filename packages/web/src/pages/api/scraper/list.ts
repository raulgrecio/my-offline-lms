import type { APIRoute } from 'astro';
import { ScraperService } from '@scraper/ScraperService';

export const GET: APIRoute = async () => {
  try {
    const scraper = await ScraperService.create();
    const tasks = await scraper.getTasks();
    
    return new Response(JSON.stringify(tasks), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
