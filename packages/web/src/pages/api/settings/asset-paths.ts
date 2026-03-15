export const prerender = false;

import type { APIRoute } from 'astro';

import { AssetPathResolver, NodeFileSystem } from '@my-offline-lms/core';

import { CONFIG_PATH, MONOREPO_ROOT } from '../../../config/paths';

const fsAdapter = new NodeFileSystem();
const resolver = new AssetPathResolver({
  configPath: CONFIG_PATH,
  monorepoRoot: MONOREPO_ROOT,
  fs: fsAdapter,
});

export const GET: APIRoute = async () => {
  try {
    const paths = resolver.getAvailablePaths();
    return new Response(JSON.stringify(paths), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Failed to get asset paths' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const { path: newPath, label } = await request.json();
    if (!newPath || !label) {
      return new Response(JSON.stringify({ error: 'path and label are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    resolver.saveNewPath(newPath, label);

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Failed to add asset path' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const DELETE: APIRoute = async ({ request }) => {
  try {
    const { path: pathToRemove } = await request.json();
    if (!pathToRemove) {
      return new Response(JSON.stringify({ error: 'path is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    resolver.removePath(pathToRemove);

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Failed to remove asset path' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
