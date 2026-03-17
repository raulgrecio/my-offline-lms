export const prerender = false;

import type { APIRoute } from 'astro';
import { updatePdfProgress } from '../../../features/progress';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { assetId, page, completed = false } = body;

    if (!assetId || page === undefined) {
      return new Response(JSON.stringify({ error: 'assetId and page are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    updatePdfProgress({
      assetId: String(assetId), 
      page: Number(page), 
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
