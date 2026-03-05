import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DiskAssetStorage } from '../../../infrastructure/repositories/DiskAssetStorage';
import fs from 'fs';

vi.mock('fs');
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
        storage = new DiskAssetStorage(mockBaseDir);
    });

    it('should ensure asset directory exists', () => {
        vi.mocked(fs.existsSync).mockReturnValue(false);
        const dir = storage.ensureAssetDir('123', 'videos');
        expect(fs.mkdirSync).toHaveBeenCalledWith('/mock/assets/123/videos', { recursive: true });
        expect(dir).toBe('/mock/assets/123/videos');
    });

    it('should ensure temp directory exists', () => {
        vi.mocked(fs.existsSync).mockReturnValue(false);
        const tempDir = storage.ensureTempDir('123', 'asset456');
        expect(fs.mkdirSync).toHaveBeenCalledWith('/mock/assets/123/guides', { recursive: true });
        expect(fs.mkdirSync).toHaveBeenCalledWith('/mock/assets/123/guides/temp_asset456', { recursive: true });
        expect(tempDir).toBe('/mock/assets/123/guides/temp_asset456');
    });

    it('should remove temp directory', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        storage.removeTempDir('/mock/tempDir');
        expect(fs.rmSync).toHaveBeenCalledWith('/mock/tempDir', { recursive: true, force: true });
    });

    it('should check if asset exists', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        expect(storage.assetExists('/mock/file.pdf')).toBe(true);
    });

    it('should verify video integrity false if file does not exist', () => {
        vi.mocked(fs.existsSync).mockReturnValue(false);
        expect(storage.verifyVideoIntegrity('/mock/video.mp4')).toBe(false);
    });

    it('should verify video integrity false if file is smaller than 200KB', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.statSync).mockReturnValue({ size: 100000 } as fs.Stats);
        expect(storage.verifyVideoIntegrity('/mock/video.mp4')).toBe(false);
    });

    it('should verify video integrity true if file is greater than 200KB', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.statSync).mockReturnValue({ size: 300000 } as fs.Stats);
        expect(storage.verifyVideoIntegrity('/mock/video.mp4')).toBe(true);
    });

    it('should write temp image', () => {
        const buffer = Buffer.from('test');
        storage.writeTempImage('/mock/test.png', buffer);
        expect(fs.writeFileSync).toHaveBeenCalledWith('/mock/test.png', buffer);
    });

    it('should get temp image size', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.statSync).mockReturnValue({ size: 100 } as fs.Stats);
        expect(storage.getTempImageSize('/mock/test.png')).toBe(100);
    });

    it('should throw error if no images found for PDF', async () => {
        vi.mocked(fs.readdirSync).mockReturnValue([] as any);
        await expect(storage.buildPDFFromImages('/mock/dir', '/mock/out.pdf'))
            .rejects.toThrow('No hay imágenes para crear PDF');
    });

    it('should successfully build a PDF from images', async () => {
        const mockImgFiles = ['page1.png', 'page2.png'] as any;
        vi.mocked(fs.readdirSync).mockReturnValue(mockImgFiles);
        
        const mockWriteStream = new (require('events').EventEmitter)();
        vi.mocked(fs.createWriteStream).mockReturnValue(mockWriteStream as any);
        
        const promise = storage.buildPDFFromImages('/mock/dir', '/mock/out.pdf', { optimize: false, quality: 80 });
        
        mockWriteStream.emit('finish');
        
        await expect(promise).resolves.toBeUndefined();
    });

    it('should successfully build an optimized PDF from images', async () => {
        const mockImgFiles = ['page1.png'] as any;
        vi.mocked(fs.readdirSync).mockReturnValue(mockImgFiles);
        
        const mockWriteStream = new (require('events').EventEmitter)();
        vi.mocked(fs.createWriteStream).mockReturnValue(mockWriteStream as any);
        
        const promise = storage.buildPDFFromImages('/mock/dir', '/mock/out.pdf', { optimize: true, quality: 50 });
        
        mockWriteStream.emit('finish');
        
        await expect(promise).resolves.toBeUndefined();
    });
});
