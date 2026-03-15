export const MIME_MAP: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mkv': 'video/x-matroska',
  '.pdf': 'application/pdf',
  '.vtt': 'text/vtt',
  '.srt': 'text/plain',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
};

export function getMimeType(extension: string): string {
  return MIME_MAP[extension.toLowerCase()] ?? 'application/octet-stream';
}
