export const prerender = false;

import type { APIRoute } from 'astro';
import path from 'path';

import { AssetPathResolver, NodeFileSystem, UniversalFileSystem, HttpFileSystem, getMimeType } from '@my-offline-lms/core';
import { CONFIG_PATH, MONOREPO_ROOT } from '@config/paths';

const nodeFs = new NodeFileSystem();
const universalFs = new UniversalFileSystem(nodeFs);
universalFs.registerRemote('http', new HttpFileSystem());

const resolver = new AssetPathResolver({
  configPath: CONFIG_PATH,
  monorepoRoot: MONOREPO_ROOT,
  fs: universalFs,
});

export const GET: APIRoute = async ({ request, url }) => {
  const filePath = url.searchParams.get('path');

  if (!filePath) {
    return new Response('Missing path parameter', { status: 400 });
  }

  // Resolver: first try raw path, then search in other roots
  const resolved = await resolver.resolveExistingPath(filePath);

  if (!resolved) {
    return new Response('File not found at any location', { status: 404 });
  }

  // Si es una URL externa, redirigimos o manejamos de forma especial
  if (resolved.startsWith('http://') || resolved.startsWith('https://')) {
    return Response.redirect(resolved, 302);
  }

  const ext = path.extname(resolved).toLowerCase();
  const mimeType = getMimeType(ext);

  try {
    const stat = await universalFs.stat(resolved);
    const fileSize = stat.size;
    const range = request.headers.get('range');

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize) {
        return new Response(null, {
          status: 416,
          headers: { 'Content-Range': `bytes */${fileSize}` }
        });
      }

      const chunksize = (end - start) + 1;
      const file = universalFs.createReadStream!(resolved, { start, end });

      // @ts-ignore
      return new Response(file, {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': String(chunksize),
          'Content-Type': mimeType,
          'Cache-Control': 'public, max-age=31536000',
        }
      });
    } else {
      const file = universalFs.createReadStream!(resolved);
      // @ts-ignore
      return new Response(file, {
        status: 200,
        headers: {
          'Content-Length': String(fileSize),
          'Content-Type': mimeType,
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=31536000',
        },
      });
    }
  } catch (err) {
    console.error('[Local Asset Error]', err);
    return new Response('Error reading file', { status: 500 });
  }
};
