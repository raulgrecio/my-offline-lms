import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DownloadVideos } from '../../../application/use-cases/DownloadVideos';

vi.mock('../../../domain/services/AssetNamingService', () => ({
    AssetNamingService: {
        generateSafeFilename: vi.fn().mockReturnValue('01_Video_1')
    }
}));

describe('DownloadVideos Use Case', () => {
    let callCount = 0;
    const mockBrowserProvider = {
        getAuthenticatedContext: vi.fn(),
        close: vi.fn().mockResolvedValue(undefined)
    } as any;
    const mockCourseRepo = {
        getCourseById: vi.fn().mockReturnValue({ title: 'Test Course' })
    } as any;
    const mockAssetRepo = {
        getPendingAssets: vi.fn(),
        getAssetById: vi.fn(),
        updateAssetCompletion: vi.fn(),
        updateAssetStatus: vi.fn(),
    } as any;
    const mockAssetStorage = {
        ensureAssetDir: vi.fn().mockReturnValue('/mock/videos'),
        assetExists: vi.fn(),
        verifyVideoIntegrity: vi.fn(),
    } as any;
    const mockVideoDownloader = {
        download: vi.fn().mockImplementation(() => {
            callCount++;
            return Promise.resolve();
        })
    } as any;

    const mockPage = {
        goto: vi.fn().mockResolvedValue(undefined),
        waitForTimeout: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined),
        url: vi.fn().mockReturnValue('http://mock-url'),
        on: vi.fn(),
        $: vi.fn().mockResolvedValue({ click: vi.fn() }),
        locator: vi.fn().mockReturnValue({ 
            first: vi.fn().mockReturnThis(),
            getAttribute: vi.fn().mockResolvedValue('mock-attr'),
            isVisible: vi.fn().mockResolvedValue(true),
            click: vi.fn().mockResolvedValue(undefined)
        })
    } as any;

    const mockContext = {
        newPage: vi.fn().mockResolvedValue(mockPage),
        close: vi.fn().mockResolvedValue(undefined)
    } as any;

    let useCase: DownloadVideos;

    beforeEach(() => {
        vi.clearAllMocks();
        callCount = 0;
        // Mock global setTimeout to avoid delays in tests
        vi.spyOn(global, 'setTimeout').mockImplementation((fn: any) => {
            if (typeof fn === 'function') fn();
            return { unref: () => {} } as any;
        });
        useCase = new DownloadVideos({
            browserProvider: mockBrowserProvider, 
            courseRepo: mockCourseRepo, 
            assetRepo: mockAssetRepo, 
            assetStorage: mockAssetStorage, 
            videoDownloader: mockVideoDownloader
        });
    });

    it('should process pending videos and download them', async () => {
        const mockAsset = { id: 'v1', url: 'http://v1', type: 'video', metadata: { title: "Video 1", order_index: 1 }, courseId: '123' };
        mockAssetRepo.getPendingAssets.mockReturnValue([mockAsset]);
        mockAssetRepo.getAssetById.mockReturnValue(mockAsset);
        mockBrowserProvider.getAuthenticatedContext.mockResolvedValue(mockContext);
        
        mockAssetStorage.verifyVideoIntegrity.mockReturnValue(false);

        await useCase.executeForCourse('123');

        expect(callCount).toBeGreaterThan(0);
        expect(mockAssetRepo.updateAssetStatus).toHaveBeenCalledWith('v1', 'DOWNLOADING');
    });

    it('should handle download errors', async () => {
        const mockAsset = { id: 'v1', url: 'http://v1', type: 'video', metadata: { title: "Video 1", order_index: 1 }, courseId: '123' };
        mockAssetRepo.getPendingAssets.mockReturnValue([mockAsset]);
        mockAssetRepo.getAssetById.mockReturnValue(mockAsset);
        mockBrowserProvider.getAuthenticatedContext.mockResolvedValue(mockContext);
        mockAssetStorage.verifyVideoIntegrity.mockReturnValue(false);
        
        mockVideoDownloader.download.mockRejectedValue(new Error('Downloader failed'));

        await useCase.executeForCourse('123');

        expect(mockAssetRepo.updateAssetStatus).toHaveBeenCalledWith('v1', 'FAILED');
    });
});
