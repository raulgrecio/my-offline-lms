export const prerender = false;

import type { APIRoute } from 'astro';
import { updateVideoProgress } from '../../../features/progress';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { assetId, positionSec, completed = false } = body;

    if (!assetId || positionSec === undefined) {
      return new Response(JSON.stringify({ error: 'assetId and positionSec are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    updateVideoProgress({
      assetId: String(assetId), 
      positionSec: Number(positionSec), 
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
