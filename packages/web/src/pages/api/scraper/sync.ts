import type { APIRoute } from 'astro';

import { DownloadType } from '@core/domain';
import { ScraperService } from '@scraper/ScraperService';
import { ScraperTaskCategory, ScraperTaskAction } from '@scraper/features/task-management';
import { logger } from '@web/platform/logging';

interface SyncRequestBody {
  url: string;
  type: ScraperTaskCategory;
  targetId?: string;
  taskId: string;
  downloadVideos: boolean;
  downloadGuides: boolean;
  includeDownload?: boolean;
  autoStart?: boolean;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const {
      url,
      type,
      targetId,
      taskId,
      downloadVideos,
      downloadGuides,
      includeDownload = true,
      autoStart = true
    } = await request.json() as SyncRequestBody;

    if (!url || !taskId) {
      return new Response(JSON.stringify({ error: 'URL and Task ID are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const scraper = await ScraperService.create();
    const downloadType = (downloadVideos && downloadGuides)
      ? DownloadType.ALL
      : (downloadVideos ? DownloadType.VIDEO : DownloadType.GUIDE);

    // Initial task state
    const category = type === ScraperTaskCategory.PATH ? ScraperTaskCategory.PATH : ScraperTaskCategory.COURSE;

    // Determine the correct action based on whether the content already exists
    const action = targetId
      ? (category === ScraperTaskCategory.PATH ? ScraperTaskAction.DOWNLOAD_PATH : ScraperTaskAction.DOWNLOAD_COURSE)
      : (category === ScraperTaskCategory.PATH ? ScraperTaskAction.SYNC_PATH : ScraperTaskAction.SYNC_COURSE);

    await scraper.createTask({
      id: taskId,
      type: category,
      action,
      url,
      targetId,
      metadata: { includeDownload, download: downloadType }
    });

    // Run in the background only if autoStart is true
    if (autoStart) {
      (async () => {
        try {
          let resolvedId = targetId;

          if (!targetId) {
            // New content, sync first
            if (category === ScraperTaskCategory.COURSE) {
              await scraper.syncCourse({ url, taskId });
              resolvedId = scraper.resolveCourseId(url);
            } else {
              await scraper.syncPath({ url, taskId });
              resolvedId = scraper.resolvePathId(url);
            }
          }

          // After potential sync, download ONLY if requested
          if (includeDownload) {
            await scraper.download({
              download: downloadType,
              taskId,
              entityId: resolvedId || '',
              entityType: category
            });
          }

        } catch (err: any) {
          logger.error('Async scraping error:', err);
        }
      })();
    }

    return new Response(JSON.stringify({
      ok: true,
      taskId,
      message: autoStart ? 'Sincronización iniciada.' : 'Tarea creada y validada. Lista para iniciar.'
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
