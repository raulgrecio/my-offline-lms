export const prerender = false;

import type { APIRoute } from 'astro';
import { updateVideoProgress } from '../../../features/progress';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { assetId, position, completed = false } = body;

    if (!assetId || position === undefined) {
      return new Response(JSON.stringify({ error: 'assetId and position are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    updateVideoProgress({
      assetId: String(assetId), 
      position: Number(position), 
      completed: Boolean(completed)
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
