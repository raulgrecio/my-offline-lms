import type { APIRoute } from 'astro';
import { ScraperService } from '@scraper/ScraperService';
import type { ScraperTaskType } from '@scraper/features/task-management';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { url, type, targetId, downloadVideos, downloadGuides } = await request.json();

    if (!url) {
      return new Response(JSON.stringify({ error: 'URL is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const scraper = await ScraperService.create();
    const downloadType = (downloadVideos && downloadGuides) ? 'all' : (downloadVideos ? 'video' : 'guide');

    const taskId = await scraper.createTask({
      type: type as ScraperTaskType,
      url,
      targetId
    });

    // Run in the background
    (async () => {
      try {
        if (!targetId) {
          // New content, sync first
          if (type === 'course') {
            await scraper.syncCourse({ url, taskId });
          } else {
            await scraper.syncPath({ url, taskId });
          }
        }

        // After potential sync, download
        const resolvedId = targetId || url.split('/').pop() || '';
        await scraper.download({
          type: downloadType,
          taskId,
          entityId: resolvedId,
          entityType: type === 'path' ? 'path' : 'course'
        });

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
