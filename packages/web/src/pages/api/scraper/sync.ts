import type { APIRoute } from 'astro';
import { ScraperService } from '@scraper/ScraperService';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { url, type, downloadVideos, downloadGuides } = await request.json();

    if (!url) {
      return new Response(JSON.stringify({ error: 'URL is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const scraper = new ScraperService();
    const downloadType = (downloadVideos && downloadGuides) ? 'all' : (downloadVideos ? 'video' : 'guide');

    // For now, we run it in the background to not block the request
    // In a real app, we would use a task queue (like BullMQ or a simple table)
    (async () => {
      try {
        if (type === 'course') {
          await scraper.syncCourse(url);
          const courseId = url.split('/').pop() || ''; // Simplified extraction
          await scraper.download(courseId, downloadType);
        } else {
          await scraper.syncPath(url);
          const pathId = url.split('/').pop() || '';
          await scraper.download(pathId, downloadType, true);
        }
      } catch (err: any) {
        console.error('Async scraping error:', err);
      }
    })();

    return new Response(JSON.stringify({
      ok: true,
      message: 'Sincronización iniciada en segundo plano.'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: 'Failed to start sync' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
