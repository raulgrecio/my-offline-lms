export const prerender = false;

import type { APIRoute } from 'astro';
import { updateVideoProgress } from '@features/progress';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { assetId, courseId, position, duration } = body;

    if (!assetId || !courseId || position === undefined) {
      return new Response(JSON.stringify({ error: 'assetId, courseId and position are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    updateVideoProgress({
      assetId: String(assetId),
      id: String(courseId),
      position: Number(position),
      duration: duration !== undefined ? Number(duration) : undefined
    });

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
