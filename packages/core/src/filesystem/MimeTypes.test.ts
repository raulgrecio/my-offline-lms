import { describe, it, expect } from 'vitest';
import { getMimeType, MIME_MAP } from './MimeTypes';

describe('MimeTypes', () => {
  it('should return correct mime type for known extensions', () => {
    expect(getMimeType('.mp4')).toBe('video/mp4');
    expect(getMimeType('.pdf')).toBe('application/pdf');
    expect(getMimeType('.png')).toBe('image/png');
  });

  it('should be case insensitive', () => {
    expect(getMimeType('.MP4')).toBe('video/mp4');
    expect(getMimeType('.Pdf')).toBe('application/pdf');
  });

  it('should return default mime type for unknown extensions', () => {
    expect(getMimeType('.unknown')).toBe('application/octet-stream');
    expect(getMimeType('')).toBe('application/octet-stream');
  });

  it('should have all expected extensions in MIME_MAP', () => {
    const extensions = Object.keys(MIME_MAP);
    expect(extensions).toContain('.mp4');
    expect(extensions).toContain('.webm');
    expect(extensions).toContain('.mkv');
    expect(extensions).toContain('.pdf');
    expect(extensions).toContain('.vtt');
    expect(extensions).toContain('.srt');
    expect(extensions).toContain('.jpg');
    expect(extensions).toContain('.jpeg');
    expect(extensions).toContain('.png');
  });
});
