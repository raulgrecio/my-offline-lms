import type { APIRoute } from 'astro';
import { ScraperService } from '@scraper/ScraperService';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { taskId } = await request.json();
    if (!taskId) {
      return new Response(JSON.stringify({ error: 'taskId is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const scraper = await ScraperService.create();
    await scraper.cancelTask(taskId);

    return new Response(JSON.stringify({ ok: true, message: 'Cancelación solicitada.' }), {
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
