export const prerender = false;

import type { APIRoute } from 'astro';

import { updateAssetMetadata, getAssetById } from '@features/courses';

export const GET: APIRoute = async ({ url }) => {
  const assetId = url.searchParams.get('assetId');
  if (!assetId) {
    return new Response(JSON.stringify({ error: 'assetId is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const asset = getAssetById({ assetId });
  if (!asset) {
    return new Response(JSON.stringify({ error: 'Asset not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify(asset.metadata), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { assetId, totalPages } = body;

    if (!assetId || !totalPages) {
      return new Response(JSON.stringify({ error: 'assetId and totalPages are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    updateAssetMetadata({ assetId, totalPages: Number(totalPages) });

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
