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

    const scraper = await ScraperService.create();
    const downloadType = (downloadVideos && downloadGuides) ? 'all' : (downloadVideos ? 'video' : 'guide');

    const taskId = await scraper.createTask({
      type: type as 'course' | 'path',
      url,
    });

    // Run in the background
    (async () => {
      try {
        if (type === 'course') {
          await scraper.syncCourse(url, taskId);
          const courseId = url.split('/').pop() || '';
          await scraper.download(courseId, downloadType, false, taskId);
        } else {
          await scraper.syncPath(url, taskId);
          const pathId = url.split('/').pop() || '';
          await scraper.download(pathId, downloadType, true, taskId);
        }
      } catch (err: any) {
        console.error('Async scraping error:', err);
      }
    })();

    return new Response(JSON.stringify({
      ok: true,
      taskId,
      message: 'Sincronización iniciada.'
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
