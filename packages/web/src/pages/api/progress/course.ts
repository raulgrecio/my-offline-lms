export const prerender = false;

import type { APIRoute } from 'astro';

import { markCourseStatus } from '@features/progress';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { courseId, status } = body;

    if (!courseId || !status) {
      return new Response(JSON.stringify({ error: 'courseId and status are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const validStatuses = ['not_started', 'in_progress', 'completed'];
    if (!validStatuses.includes(status)) {
      return new Response(JSON.stringify({ error: `status must be one of: ${validStatuses.join(', ')}` }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    markCourseStatus({ id: String(courseId), status });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
