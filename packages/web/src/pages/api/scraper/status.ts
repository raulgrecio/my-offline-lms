import type { APIRoute } from 'astro';
import { ScraperService } from '@scraper/ScraperService';

export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const taskId = url.searchParams.get('taskId');
    const scraper = await ScraperService.create();

    if (taskId) {
      // Get specific task
      const task = await scraper.getTaskById(taskId);
      return new Response(JSON.stringify(task || { error: 'Task not found' }), {
        status: task ? 200 : 404,
        headers: { 'Content-Type': 'application/json' },
      });
    } else {
      // Get active task
      const activeTask = await scraper.getActiveTask();
      return new Response(JSON.stringify(activeTask || { active: false }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
