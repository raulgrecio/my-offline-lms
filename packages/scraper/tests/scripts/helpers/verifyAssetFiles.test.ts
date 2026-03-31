import { describe, it, expect, vi } from 'vitest';
import { verifyAssetFiles } from '../../../src/scripts/helpers/verifyAssetFiles';

// Mock dependencies
vi.mock('@core/filesystem', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    AssetPathResolver: class {
      ensureInitialized = vi.fn(async () => { });
      findAsset = vi.fn(async (courseId: string, type: string, filename: string) => {
        if (filename === 'custom-name.pdf') return `/path/to/course-${courseId}/guides/custom-name.pdf`;
        if (filename === 'custom-name.mp4') return `/path/to/course-${courseId}/videos/custom-name.mp4`;
        return null;
      });
      getDefaultWritePath = vi.fn(async () => '/default/path');
      listAssets = vi.fn(async () => []);
    },
    NodeFileSystem: class {
      exists = vi.fn(async (p: string) => {
        if (p === '/missing/path.pdf') return false;
        if (p.includes('course-other')) return false; // This triggers missing video dir
        return true;
      });
      readdir = vi.fn(async (p: string) => {
        if (p.includes('course-course-123/videos')) return ['custom-name.vtt'];
        if (p.includes('already')) return ['exists.vtt'];
        return [];
      });
      readFileSync = vi.fn(() => '{}');
    },
    NodePath: class {
      resolve = vi.fn((...args) => args.join('/'));
      join = vi.fn((...args) => args.join('/'));
      dirname = vi.fn((p) => p.split('/').slice(0, -1).join('/'));
      basename = vi.fn((p, ext) => {
        const b = p.split('/').pop() || '';
        return ext ? b.replace(ext, '') : b;
      });
      extname = vi.fn((p) => p.includes('.') ? '.' + p.split('.').pop() : '');
      sep = '/';
    },
    ASSET_FOLDERS: {
      guide: 'guides',
      video: 'videos',
    }
  };
});

// Mock config/paths
vi.mock('@scraper/config/paths', () => ({
  getAssetPathsConfig: vi.fn(async () => '/mock/config.json'),
  getMonorepoRoot: vi.fn(async () => '/mock/root'),
}));

describe('verifyAssetFiles', () => {
  const courseId = 'course-123';

  it('should prioritize meta.filename for guides', async () => {
    const result = await verifyAssetFiles({
      type: 'guide',
      courseId,
      metadataStr: JSON.stringify({ filename: 'custom-name.pdf' })
    });
    expect(result.expectedPath).toContain('custom-name.pdf');
  });

  it('should fallback to safeName if meta.filename is missing (guides)', async () => {
    const result = await verifyAssetFiles({
      type: 'guide',
      courseId,
      metadataStr: JSON.stringify({ name: 'Guide', order_index: 1 })
    });
    expect(result.expectedPath).toContain('01_Guide.pdf');
  });

  it('should handle missing metadata string', async () => {
    const result = await verifyAssetFiles({
      type: 'video',
      courseId,
      metadataStr: ''
    });
    expect(result.videoExists).toBe(false);
  });

  it('should handle localPath and detect isGuide', async () => {
    const result = await verifyAssetFiles({
      type: 'guide',
      courseId,
      metadataStr: '{}',
      localPath: '/already/exists.pdf'
    });
    expect(result.guideExists).toBe(true);
    expect(result.actualPath).toBe('/already/exists.pdf');
  });

  it('should fallback if localPath does not exist', async () => {
    const result = await verifyAssetFiles({
      type: 'guide',
      courseId,
      metadataStr: JSON.stringify({ filename: 'custom-name.pdf' }),
      localPath: '/missing/path.pdf'
    });
    expect(result.actualPath).toBe(`/path/to/course-${courseId}/guides/custom-name.pdf`);
  });

  it('should detect VTT existence for videos', async () => {
    const result = await verifyAssetFiles({
      type: 'video',
      courseId,
      metadataStr: JSON.stringify({ filename: 'custom-name.mp4' })
    });
    expect(result.videoExists).toBe(true);
    expect(result.vttExists).toBe(true);
  });

  it('should handle video directory not existing for VTT check', async () => {
    // foundPath: /default/path/course-other/videos/missing.mp4
    // videoDir: /default/path/course-other/videos
    const result = await verifyAssetFiles({
      type: 'video',
      courseId: 'other', // specific courseId to trigger missing path in mock
      metadataStr: JSON.stringify({ filename: 'custom-name.mp4' })
    });
    expect(result.videoExists).toBe(true);
    expect(result.vttExists).toBe(false);
  });

  it('should fuzzy match VTT for localPath videos', async () => {
    const result = await verifyAssetFiles({
      type: 'video',
      courseId,
      metadataStr: '{}',
      localPath: '/already/exists.mp4'
    });
    expect(result.vttExists).toBe(true);
  });
});
