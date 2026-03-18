export const prerender = false;

import type { APIRoute } from 'astro';
import { updateGuideProgress } from '../../../features/progress';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { assetId, courseId, page, totalPages } = body;

    if (!assetId || !courseId || page === undefined) {
      return new Response(JSON.stringify({ error: 'assetId, courseId and page are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    updateGuideProgress({
      assetId: String(assetId),
      courseId: String(courseId),
      position: Number(page),
      duration: totalPages !== undefined ? Number(totalPages) : undefined
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
