import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DownloadGuides } from '../../../application/use-cases/DownloadGuides';

vi.mock('../../../domain/services/AssetNamingService', () => ({
    AssetNamingService: {
        generateSafeFilename: vi.fn().mockReturnValue('safe_name')
    }
}));

describe('DownloadGuides Use Case', () => {
    let mockBrowserProvider: any;
    let mockCourseRepo: any;
    let mockAssetRepo: any;
    let mockAssetStorage: any;
    let mockLogger: any;
    let useCase: DownloadGuides;

    beforeEach(() => {
        vi.clearAllMocks();
        
        mockBrowserProvider = {
            getAuthenticatedContext: vi.fn(),
            close: vi.fn().mockResolvedValue(undefined),
        };

        mockCourseRepo = {
            getCourseById: vi.fn().mockReturnValue({ title: 'Test Course' })
        };
        
        mockAssetRepo = {
            getPendingAssets: vi.fn().mockReturnValue([]),
            getAssetById: vi.fn(),
            updateAssetCompletion: vi.fn(),
            updateAssetStatus: vi.fn(),
        };

        mockAssetStorage = {
            ensureAssetDir: vi.fn(),
            ensureTempDir: vi.fn().mockReturnValue('/mock/temp'),
            assetExists: vi.fn(),
            writeTempImage: vi.fn(),
            getTempImageSize: vi.fn().mockReturnValue(0),
            buildPDFFromImages: vi.fn().mockResolvedValue(undefined),
            removeTempDir: vi.fn(),
        };

        mockLogger = {
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
            debug: vi.fn(),
            withContext: vi.fn().mockReturnThis(),
        };

        // Mock global setTimeout to avoid delays in tests
        vi.spyOn(global, 'setTimeout').mockImplementation((fn: any) => {
            if (typeof fn === 'function') fn();
            return { unref: () => {} } as any;
        });

        useCase = new DownloadGuides({ 
            browserProvider: mockBrowserProvider, 
            courseRepo: mockCourseRepo, 
            assetRepo: mockAssetRepo, 
            assetStorage: mockAssetStorage,
            logger: mockLogger,
        });
    });

    it('should return early if no pending guides', async () => {
        mockAssetRepo.getPendingAssets.mockReturnValue([]);
        await useCase.executeForCourse('c1');
        expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('No hay guías pendientes'));
        expect(mockBrowserProvider.getAuthenticatedContext).not.toHaveBeenCalled();
    });

    it('should skip download if guide already exists', async () => {
        mockAssetRepo.getPendingAssets.mockReturnValue([
            { id: 'g1', type: 'guide', metadata: { title: "Test Guide", ekitId: "ekit123", order_index: 1 }, url: 'http://g1' }
        ]);
        mockAssetRepo.getAssetById.mockReturnValue({ id: 'g1', type: 'guide', metadata: { ekitId: 'e1' } });
        mockAssetStorage.assetExists.mockReturnValue(true);
        mockAssetStorage.getTempImageSize.mockReturnValue(100);

        await useCase.executeForCourse('c1');

        expect(mockAssetStorage.buildPDFFromImages).not.toHaveBeenCalled();
        expect(mockAssetRepo.updateAssetCompletion).toHaveBeenCalled();
    });

    it('should process guides and download images to create PDF', async () => {
        const mockPage = {
            goto: vi.fn().mockResolvedValue(undefined),
            waitForTimeout: vi.fn(),
            waitForSelector: vi.fn().mockResolvedValue({ getAttribute: vi.fn().mockResolvedValue('http://iframe-src') }),
            evaluate: vi.fn()
                .mockResolvedValueOnce(2) // pagesCount
                .mockResolvedValue([255, 216, 255]), // mock buffer array
            close: vi.fn().mockResolvedValue(undefined),
        };
        const mockContext = { 
            newPage: vi.fn().mockResolvedValue(mockPage), 
            close: vi.fn() 
        };
        mockBrowserProvider.getAuthenticatedContext.mockResolvedValue(mockContext);

        mockAssetRepo.getPendingAssets.mockReturnValue([
            { id: 'g1', type: 'guide', metadata: { title: "Test Guide", ekitId: "ekit123", order_index: 1 }, courseId: 'c1' }
        ]);
        mockAssetRepo.getAssetById.mockReturnValue({ 
            id: 'g1', 
            type: 'guide', 
            metadata: { title: "Test Guide", ekitId: "ekit123", order_index: 1 },
            courseId: 'c1'
        });
        mockAssetStorage.assetExists.mockReturnValue(false);
        mockAssetStorage.buildPDFFromImages.mockResolvedValue(undefined);

        await useCase.executeForCourse('c1');

        expect(mockAssetStorage.writeTempImage).toHaveBeenCalled();
        expect(mockAssetStorage.buildPDFFromImages).toHaveBeenCalled();
        expect(mockAssetRepo.updateAssetCompletion).toHaveBeenCalled();
    });

    it('should handle retry when image download fails', async () => {
        const mockPage = {
            goto: vi.fn().mockResolvedValue(undefined),
            waitForTimeout: vi.fn(),
            waitForSelector: vi.fn().mockResolvedValue({ getAttribute: vi.fn().mockResolvedValue('http://iframe-src') }),
            evaluate: vi.fn()
                .mockResolvedValueOnce(1) // 1 page
                .mockRejectedValueOnce(new Error('Fetch failed')) // fail attempt 1
                .mockResolvedValueOnce([255, 216, 255]), // success attempt 2
            close: vi.fn().mockResolvedValue(undefined),
        };
        const mockContext = { 
            newPage: vi.fn().mockResolvedValue(mockPage), 
            close: vi.fn() 
        };
        mockBrowserProvider.getAuthenticatedContext.mockResolvedValue(mockContext);

        mockAssetRepo.getPendingAssets.mockReturnValue([{ id: 'g1', type: 'guide', metadata: { ekitId: 'e1' }, courseId: 'c1' }]);
        mockAssetRepo.getAssetById.mockReturnValue({ id: 'g1', type: 'guide', metadata: { ekitId: 'e1' } });
        
        await useCase.executeForCourse('c1');

        expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Intento 1 fallido'));
    });

    it('should fail if all attempts to download a page fail', async () => {
        const mockPage = {
            goto: vi.fn().mockResolvedValue(undefined),
            waitForTimeout: vi.fn(),
            waitForSelector: vi.fn().mockResolvedValue({ getAttribute: vi.fn().mockResolvedValue('http://iframe-src') }),
            evaluate: vi.fn()
                .mockResolvedValueOnce(1) // 1 page
                .mockRejectedValue(new Error('Fetch failed')), // all attempts fail
            close: vi.fn().mockResolvedValue(undefined),
        };
        const mockContext = { 
            newPage: vi.fn().mockResolvedValue(mockPage), 
            close: vi.fn() 
        };
        mockBrowserProvider.getAuthenticatedContext.mockResolvedValue(mockContext);

        mockAssetRepo.getPendingAssets.mockReturnValue([{ id: 'g1', type: 'guide', metadata: { ekitId: 'e1' }, courseId: 'c1' }]);
        mockAssetRepo.getAssetById.mockReturnValue({ id: 'g1', type: 'guide', metadata: { ekitId: 'e1' } });
        
        await useCase.executeForCourse('c1');

        expect(mockAssetRepo.updateAssetStatus).toHaveBeenCalledWith('g1', 'FAILED');
    });

    it('should remove temp dir if keepTempImages is false', async () => {
        (useCase as any).keepTempImages = false;

        const mockPage = {
            goto: vi.fn().mockResolvedValue(undefined),
            waitForTimeout: vi.fn(),
            waitForSelector: vi.fn().mockResolvedValue({ getAttribute: vi.fn().mockResolvedValue('http://iframe-src') }),
            evaluate: vi.fn().mockResolvedValueOnce(1).mockResolvedValueOnce([1,2,3]),
            close: vi.fn().mockResolvedValue(undefined),
        };
        const mockContext = { newPage: vi.fn().mockResolvedValue(mockPage), close: vi.fn() };
        mockBrowserProvider.getAuthenticatedContext.mockResolvedValue(mockContext);

        mockAssetRepo.getPendingAssets.mockReturnValue([{ id: 'g1', type: 'guide', metadata: { ekitId: 'e1' }, courseId: 'c1' }]);
        mockAssetRepo.getAssetById.mockReturnValue({ id: 'g1', type: 'guide', metadata: { ekitId: 'e1', title: 'T' } });

        await useCase.executeForCourse('c1');

        expect(mockAssetStorage.removeTempDir).toHaveBeenCalled();
    });

    it('should close browser provider if sharedContext is null', async () => {
        const mockPage = {
            goto: vi.fn().mockResolvedValue(undefined),
            waitForTimeout: vi.fn(),
            waitForSelector: vi.fn().mockResolvedValue({ getAttribute: vi.fn().mockResolvedValue('http://iframe-src') }),
            evaluate: vi.fn().mockResolvedValueOnce(1).mockResolvedValueOnce([1,2,3]),
            close: vi.fn().mockResolvedValue(undefined),
        };
        const mockContext = { newPage: vi.fn().mockResolvedValue(mockPage), close: vi.fn() };
        mockBrowserProvider.getAuthenticatedContext.mockResolvedValue(mockContext);

        mockAssetRepo.getAssetById.mockReturnValue({ id: 'g1', type: 'guide', metadata: { ekitId: 'e1', title: 'T' } });

        await useCase.downloadSingleGuide('g1', 'c1');

        expect(mockBrowserProvider.close).toHaveBeenCalled();
    });
});
