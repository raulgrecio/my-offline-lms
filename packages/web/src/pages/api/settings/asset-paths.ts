export const prerender = false;

import type { APIRoute } from 'astro';

import { AssetPathResolver, NodeFileSystem, NodePath } from '@my-offline-lms/core/filesystem';
import { getAssetConfigPath, getMonorepoRoot } from '@config/paths';
import { logger } from '@platform/logging';

const fsAdapter = new NodeFileSystem();
const pathAdapter = new NodePath();
export const GET: APIRoute = async () => {
  const resolver = new AssetPathResolver({
    configPath: await getAssetConfigPath(),
    monorepoRoot: await getMonorepoRoot(),
    fs: fsAdapter,
    path: pathAdapter,
    logger,
  });

  try {
    const paths = await resolver.getAvailablePaths();
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

    const resolver = new AssetPathResolver({
      configPath: await getAssetConfigPath(),
      monorepoRoot: await getMonorepoRoot(),
      fs: fsAdapter,
      path: pathAdapter,
      logger,
    });
    await resolver.saveNewPath(newPath, label);

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

    const resolver = new AssetPathResolver({
      configPath: await getAssetConfigPath(),
      monorepoRoot: await getMonorepoRoot(),
      fs: fsAdapter,
      path: pathAdapter,
      logger,
    });
    await resolver.removePath(pathToRemove);

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
