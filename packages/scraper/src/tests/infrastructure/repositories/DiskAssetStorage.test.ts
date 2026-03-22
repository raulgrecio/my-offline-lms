import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DiskAssetStorage } from '@features/asset-download/infrastructure/DiskAssetStorage';
import fs from 'fs';
import path from 'path';

// Mock core exports used by DiskAssetStorage
vi.mock('@my-offline-lms/core', async (importOriginal) => {
    const actual = await importOriginal<any>();
    return {
        ...actual,
        AssetPathResolver: vi.fn().mockImplementation(function() {
            return {
                resolveExistingPath: vi.fn(async (p: string) => p.includes('resolved') ? p : null),
                findAsset: vi.fn(async () => '/mock/found/asset'),
                ensureInitialized: vi.fn(async () => {})
            };
        })
    };
});

vi.mock('fs', async () => {
    const actual = await vi.importActual<typeof import('fs')>('fs');
    const mockPromises = {
        access: vi.fn().mockResolvedValue(undefined),
        readFile: vi.fn().mockResolvedValue('{}'),
        writeFile: vi.fn().mockResolvedValue(undefined),
        readdir: vi.fn().mockResolvedValue([]),
        mkdir: vi.fn().mockResolvedValue(undefined),
        rm: vi.fn().mockResolvedValue(undefined),
        stat: vi.fn().mockResolvedValue({ size: 300000 }),
        unlink: vi.fn().mockResolvedValue(undefined),
    };

    return {
        default: {
            ...actual,
            existsSync: vi.fn(),
            mkdirSync: vi.fn(),
            rmSync: vi.fn(),
            statSync: vi.fn(),
            writeFileSync: vi.fn(),
            readdirSync: vi.fn(),
            createWriteStream: vi.fn(),
            readFileSync: vi.fn(),
            promises: mockPromises
        }
    };
});
vi.mock('path', async () => {
    const actual = await vi.importActual<typeof import('path')>('path');
    return {
        default: {
            ...actual,
            join: vi.fn((...args) => actual.join(...args))
        }
    };
});

// Mock pdfkit as a constructor
vi.mock('pdfkit', () => {
    return {
        default: vi.fn().mockImplementation(function() {
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

describe('DiskAssetStorage', () => {
    const mockBaseDir = '/mock/assets';
    let storage: DiskAssetStorage;

    beforeEach(() => {
        vi.clearAllMocks();
        // Fallback default for exists and readFile (via fs.promises)
        vi.mocked(fs.promises.access).mockResolvedValue(undefined); // exists
        vi.mocked(fs.promises.readFile).mockResolvedValue('{}');
        storage = new DiskAssetStorage(mockBaseDir);
    });

    it('should ensure asset directory exists', async () => {
        vi.mocked(fs.promises.access).mockRejectedValue(new Error('ENOENT'));
        const dir = await storage.ensureAssetDir('123', 'video');
        expect(fs.promises.mkdir).toHaveBeenCalledWith('/mock/assets/123/videos', { recursive: true });
        expect(dir).toBe('/mock/assets/123/videos');
    });

    it('should ensure temp directory exists', async () => {
        vi.mocked(fs.promises.access).mockRejectedValue(new Error('ENOENT'));
        const tempDir = await storage.ensureTempDir('123', 'asset456');
        expect(fs.promises.mkdir).toHaveBeenCalledWith('/mock/assets/123/guides', { recursive: true });
        expect(fs.promises.mkdir).toHaveBeenCalledWith('/mock/assets/123/guides/temp_asset456', { recursive: true });
        expect(tempDir).toBe('/mock/assets/123/guides/temp_asset456');
    });

    it('should remove temp directory', async () => {
        vi.mocked(fs.promises.access).mockResolvedValue(undefined);
        await storage.removeTempDir('/mock/tempDir');
        expect(fs.promises.rm).toHaveBeenCalledWith('/mock/tempDir', { recursive: true, force: true });
    });

    it('should check if asset exists', async () => {
        vi.mocked(fs.promises.access).mockResolvedValue(undefined);
        expect(await storage.assetExists('/mock/file.pdf')).toBe(true);
    });

    it('should verify video integrity false if file does not exist', async () => {
        vi.mocked(fs.promises.access).mockRejectedValue(new Error('ENOENT'));
        expect(await storage.verifyVideoIntegrity('/mock/video.mp4')).toBe(false);
    });

    it('should verify video integrity false if file is smaller than 200KB', async () => {
        vi.mocked(fs.promises.access).mockResolvedValue(undefined);
        vi.mocked(fs.promises.stat).mockResolvedValue({ size: 100000 } as fs.Stats);
        expect(await storage.verifyVideoIntegrity('/mock/video.mp4')).toBe(false);
    });

    it('should verify video integrity true if file is greater than 200KB', async () => {
        vi.mocked(fs.promises.access).mockResolvedValue(undefined);
        vi.mocked(fs.promises.stat).mockResolvedValue({ size: 300000 } as fs.Stats);
        expect(await storage.verifyVideoIntegrity('/mock/video.mp4')).toBe(true);
    });

    it('should write temp image', async () => {
        const buffer = Buffer.from('test');
        await storage.writeTempImage('/mock/test.png', buffer);
        expect(fs.promises.writeFile).toHaveBeenCalledWith('/mock/test.png', buffer);
    });

    it('should get temp image size', async () => {
        vi.mocked(fs.promises.access).mockResolvedValue(undefined);
        vi.mocked(fs.promises.stat).mockResolvedValue({ size: 100 } as fs.Stats);
        expect(await storage.getTempImageSize('/mock/test.png')).toBe(100);
    });

    it('should throw error if no images found for PDF', async () => {
        vi.mocked(fs.promises.readdir).mockResolvedValue([] as any);
        await expect(storage.buildPDFFromImages('/mock/dir', '/mock/out.pdf'))
            .rejects.toThrow('No hay imágenes para crear PDF');
    });

    it('should successfully build a PDF from images', async () => {
        const mockImgFiles = ['page1.png', 'page2.png'] as any;
        vi.mocked(fs.promises.readdir).mockResolvedValue(mockImgFiles);
        vi.mocked(fs.promises.readFile).mockResolvedValue(Buffer.from('mock'));
        
        const mockWriteStream = new (require('events').EventEmitter)();
        vi.mocked(fs.createWriteStream).mockReturnValue(mockWriteStream as any);
        
        const promise = storage.buildPDFFromImages('/mock/dir', '/mock/out.pdf', { optimize: false, quality: 80 });
        
        setTimeout(() => mockWriteStream.emit('finish'), 10);
        
        await expect(promise).resolves.toBeUndefined();
    });

    it('should successfully build an optimized PDF from images', async () => {
        const mockImgFiles = ['page1.png'] as any;
        vi.mocked(fs.promises.readdir).mockResolvedValue(mockImgFiles);
        vi.mocked(fs.promises.readFile).mockResolvedValue(Buffer.from('mock'));
        
        const mockWriteStream = new (require('events').EventEmitter)();
        vi.mocked(fs.createWriteStream).mockReturnValue(mockWriteStream as any);
        
        const promise = storage.buildPDFFromImages('/mock/dir', '/mock/out.pdf', { optimize: true, quality: 50 });
        
        setTimeout(() => mockWriteStream.emit('finish'), 10);
        
        await expect(promise).resolves.toBeUndefined();
    });
});
