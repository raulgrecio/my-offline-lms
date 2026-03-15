export const prerender = false;

import type { APIRoute } from 'astro';
import fs from 'fs';
import path from 'path';

import { AssetPathResolver, NodeFileSystem, getMimeType } from '@my-offline-lms/core';
import { CONFIG_PATH, MONOREPO_ROOT } from '../config/paths';

const fsAdapter = new NodeFileSystem();
const resolver = new AssetPathResolver({
  configPath: CONFIG_PATH,
  monorepoRoot: MONOREPO_ROOT,
  fs: fsAdapter,
});

export const GET: APIRoute = async ({ url }) => {
  const filePath = url.searchParams.get('path');

  if (!filePath) {
    return new Response('Missing path parameter', { status: 400 });
  }

  // Resolver: first try raw path, then search in other roots
  const resolved = resolver.resolveExistingPath(filePath);

  if (!resolved) {
    return new Response('File not found at any location', { status: 404 });
  }

  const ext = path.extname(resolved).toLowerCase();
  const mimeType = getMimeType(ext);

  try {
    const stat = fs.statSync(resolved);
    const fileSize = stat.size;

    // Stream the file directly
    const buffer = fs.readFileSync(resolved);

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Length': String(fileSize),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-cache',
      },
    });
  } catch {
    return new Response('Error reading file', { status: 500 });
  }
};
