import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DiskAssetStorage } from '@features/asset-download/infrastructure/DiskAssetStorage';

// Restore global mocks as requested by user
vi.mock('@my-offline-lms/core/filesystem', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    AssetPathResolver: vi.fn().mockImplementation(function () {
      return {
        resolveExistingPath: vi.fn(async (p: string) => p.includes('resolved') ? p : null),
        findAsset: vi.fn(async () => '/mock/found/asset'),
        ensureInitialized: vi.fn(async () => { }),
        getDefaultWritePath: vi.fn().mockResolvedValue('/mock/assets')
      };
    })
  };
});

// No generic fs or path mocks needed here to prove decoupling

// Mock pdfkit as a constructor
vi.mock('pdfkit', () => {
  return {
    default: vi.fn().mockImplementation(function () {
      return {
        addPage: vi.fn().mockReturnThis(),
        image: vi.fn().mockReturnThis(),
        pipe: vi.fn().mockReturnThis(),
        end: vi.fn().mockReturnThis()
      };
    })
  };
});

// Mock sharp
vi.mock('sharp', () => ({
  default: vi.fn().mockReturnValue({
    metadata: vi.fn().mockResolvedValue({ width: 100, height: 100 }),
    jpeg: vi.fn().mockReturnThis(),
    toBuffer: vi.fn().mockResolvedValue(Buffer.from('mock'))
  })
}));

// Mock @config/paths
vi.mock('@config/paths', () => ({
  getAssetsDir: vi.fn().mockResolvedValue('/mock/assets'),
  getAssetPathsConfig: vi.fn().mockResolvedValue('/mock/config.json'),
  getMonorepoRoot: vi.fn().mockResolvedValue('/mock/root')
}));

describe('DiskAssetStorage', () => {
  const mockBaseDir = '/mock/assets';
  let storage: DiskAssetStorage;
  let mockFs: any;
  let mockPath: any;
  let mockResolver: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockFs = {
      access: vi.fn().mockResolvedValue(undefined),
      stat: vi.fn().mockResolvedValue({ size: 300000, mtime: new Date(), isDirectory: () => false }),
      readFile: vi.fn().mockResolvedValue('{}'),
      writeFile: vi.fn().mockResolvedValue(undefined),
      readdir: vi.fn().mockResolvedValue([]),
      mkdir: vi.fn().mockResolvedValue(undefined),
      rm: vi.fn().mockResolvedValue(undefined),
      exists: vi.fn().mockResolvedValue(true),
      createWriteStream: vi.fn(),
      unlink: vi.fn().mockResolvedValue(undefined)
    };

    mockPath = {
      join: vi.fn((...args) => args.join('/').replace(/\/+/g, '/')),
      dirname: vi.fn((p) => p.substring(0, p.lastIndexOf('/')) || '.'),
      basename: vi.fn((p) => p.substring(p.lastIndexOf('/') + 1)),
      isAbsolute: vi.fn((p) => p.startsWith('/')),
      sep: '/'
    };

    mockResolver = {
      ensureInitialized: vi.fn().mockResolvedValue(undefined),
      getDefaultWritePath: vi.fn().mockResolvedValue(mockBaseDir),
      resolveExistingPath: vi.fn(async (p: string) => p.includes('resolved') ? p : null),
      findAsset: vi.fn(async () => '/mock/found/asset')
    };

    storage = new DiskAssetStorage({
      baseDir: mockBaseDir,
      fs: mockFs,
      path: mockPath,
      resolver: mockResolver
    });
  });

  it('should ensure asset directory exists', async () => {
    mockFs.exists.mockResolvedValue(false);
    const dir = await storage.ensureAssetDir('123', 'video');
    expect(mockFs.mkdir).toHaveBeenCalledWith('/mock/assets/123/videos', { recursive: true });
    expect(dir).toBe('/mock/assets/123/videos');
  });

  it('should ensure temp directory exists', async () => {
    mockFs.exists.mockResolvedValue(false);
    const tempDir = await storage.ensureTempDir('123', 'asset456');
    expect(mockFs.mkdir).toHaveBeenCalledWith('/mock/assets/123/guides', { recursive: true });
    expect(mockFs.mkdir).toHaveBeenCalledWith('/mock/assets/123/guides/.temp_asset456', { recursive: true });
    expect(tempDir).toBe('/mock/assets/123/guides/.temp_asset456');
  });

  it('should remove temp directory', async () => {
    await storage.removeTempDir('/mock/tempDir');
    expect(mockFs.rm).toHaveBeenCalledWith('/mock/tempDir', { recursive: true, force: true });
  });

  it('should check if asset exists', async () => {
    mockFs.exists.mockResolvedValue(true);
    expect(await storage.assetExists('/mock/file.pdf')).toBe(true);
  });

  it('should verify video integrity false if file does not exist', async () => {
    mockFs.exists.mockResolvedValue(false);
    mockResolver.resolveExistingPath.mockResolvedValue(null);
    expect(await storage.verifyVideoIntegrity('/mock/video.mp4')).toBe(false);
  });

  it('should verify video integrity false if file is smaller than 200KB', async () => {
    mockFs.exists.mockResolvedValue(true);
    mockFs.stat.mockResolvedValue({ size: 100000 });
    expect(await storage.verifyVideoIntegrity('/mock/video.mp4')).toBe(false);
  });

  it('should verify video integrity true if file is greater than 200KB', async () => {
    mockFs.exists.mockResolvedValue(true);
    mockFs.stat.mockResolvedValue({ size: 300000 });
    expect(await storage.verifyVideoIntegrity('/mock/video.mp4')).toBe(true);
  });

  it('should write temp image', async () => {
    const buffer = Buffer.from('test');
    await storage.writeTempImage('/mock/test.png', buffer);
    expect(mockFs.writeFile).toHaveBeenCalledWith('/mock/test.png', buffer);
  });

  it('should get temp image size', async () => {
    mockFs.exists.mockResolvedValue(true);
    mockFs.stat.mockResolvedValue({ size: 100 });
    expect(await storage.getTempImageSize('/mock/test.png')).toBe(100);
  });

  it('should throw error if no images found for PDF', async () => {
    mockFs.readdir.mockResolvedValue([]);
    await expect(storage.buildPDFFromImages('/mock/dir', '/mock/out.pdf'))
      .rejects.toThrow('No hay imágenes para crear PDF');
  });

  it('should successfully build a PDF from images', async () => {
    const mockImgFiles = ['page1.png', 'page2.png'];
    mockFs.readdir.mockResolvedValue(mockImgFiles);
    mockFs.readFile.mockResolvedValue(Buffer.from('mock'));

    const mockWriteStream = new (require('events').EventEmitter)();
    mockFs.createWriteStream.mockReturnValue(mockWriteStream);

    const promise = storage.buildPDFFromImages('/mock/dir', '/mock/out.pdf', { optimize: false, quality: 80 });

    setTimeout(() => mockWriteStream.emit('finish'), 10);

    await expect(promise).resolves.toBeUndefined();
  });

  it('should successfully build an optimized PDF from images', async () => {
    const mockImgFiles = ['page1.png'];
    mockFs.readdir.mockResolvedValue(mockImgFiles);
    mockFs.readFile.mockResolvedValue(Buffer.from('mock'));

    const mockWriteStream = new (require('events').EventEmitter)();
    mockFs.createWriteStream.mockReturnValue(mockWriteStream);

    const promise = storage.buildPDFFromImages('/mock/dir', '/mock/out.pdf', { optimize: true, quality: 50 });

    setTimeout(() => mockWriteStream.emit('finish'), 10);

    await expect(promise).resolves.toBeUndefined();
  });
});
