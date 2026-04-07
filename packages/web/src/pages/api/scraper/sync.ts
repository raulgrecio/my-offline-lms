import type { APIRoute } from 'astro';

import { ScraperService } from '@scraper/ScraperService';
import type { ScraperTaskType } from '@scraper/features/task-management';
import { logger } from '@web/platform/logging';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { url, type, targetId, taskId, downloadVideos, downloadGuides } = await request.json();

    if (!url || !taskId) {
      return new Response(JSON.stringify({ error: 'URL and Task ID are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const scraper = await ScraperService.create();
    const downloadType = (downloadVideos && downloadGuides) ? 'all' : (downloadVideos ? 'video' : 'guide');

    await scraper.createTask({
      id: taskId,
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
        logger.error('Async scraping error:', err);
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
