export const prerender = false;

import type { APIRoute } from 'astro';

import { setActiveLearningPath } from '../../../lib';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { pathId } = body;

    if (!pathId) {
      return new Response(JSON.stringify({ error: 'pathId is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    setActiveLearningPath(String(pathId));

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
