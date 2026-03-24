export const prerender = false;

import type { APIRoute } from 'astro';
import { getVisitedSegments } from '@features/progress';
import { type AssetType } from '@my-offline-lms/core/models';

export const GET: APIRoute = async ({ url }) => {
  const assetId = url.searchParams.get('assetId');
  const type = url.searchParams.get('type') as AssetType;

  if (!assetId || !type) {
    return new Response(JSON.stringify({ error: 'assetId and type are required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const segments = await getVisitedSegments({ id: assetId, type });
    return new Response(JSON.stringify({ segments }), {
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
