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
    
    // Background execution
    (async () => {
        try {
            await scraper.startTask(taskId);
        } catch (err: any) {
            console.error('Async task execution error:', err);
        }
    })();

    return new Response(JSON.stringify({ success: true, message: 'Tarea iniciada' }), {
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
