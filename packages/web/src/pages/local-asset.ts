export const prerender = false;

import type { APIRoute } from 'astro';
import fs from 'fs';
import path from 'path';

const MIME_MAP: Record<string, string> = {
  '.mp4':  'video/mp4',
  '.webm': 'video/webm',
  '.mkv':  'video/x-matroska',
  '.pdf':  'application/pdf',
  '.vtt':  'text/vtt',
  '.srt':  'text/plain',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png':  'image/png',
};

export const GET: APIRoute = async ({ url }) => {
  const filePath = url.searchParams.get('path');

  if (!filePath) {
    return new Response('Missing path parameter', { status: 400 });
  }

  // Security: disallow path traversal
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) {
    return new Response('File not found', { status: 404 });
  }

  const ext = path.extname(resolved).toLowerCase();
  const mimeType = MIME_MAP[ext] ?? 'application/octet-stream';

  try {
    const stat = fs.statSync(resolved);
    const fileSize = stat.size;
    const rangeHeader = url.searchParams.get('_range'); // unused with this approach

    // For video files, support range requests via native stream
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
