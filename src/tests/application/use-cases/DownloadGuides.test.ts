import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DownloadGuides } from '../../../application/use-cases/DownloadGuides';

vi.mock('../../../domain/services/AssetNamingService', () => ({
    AssetNamingService: {
        generateSafeFilename: vi.fn().mockReturnValue('safe_name')
    }
}));

describe('DownloadGuides Use Case', () => {
    const mockBrowserProvider = {
        getAuthenticatedContext: vi.fn(),
        close: vi.fn()
    } as any;
    const mockCourseRepo = {
        getCourseById: vi.fn().mockReturnValue({ title: 'Test Course' })
    } as any;
    const mockAssetRepo = {
        getPendingAssets: vi.fn(),
        getAssetById: vi.fn(),
        updateAssetCompletion: vi.fn(),
        updateAssetStatus: vi.fn()
    } as any;
    const mockAssetStorage = {
        ensureAssetDir: vi.fn(),
        ensureTempDir: vi.fn().mockReturnValue('/mock/temp'),
        assetExists: vi.fn(),
        writeTempImage: vi.fn(),
        getTempImageSize: vi.fn().mockReturnValue(0),
        buildPDFFromImages: vi.fn().mockResolvedValue(undefined),
        removeTempDir: vi.fn()
    } as any;

    let useCase: DownloadGuides;

    beforeEach(() => {
        vi.clearAllMocks();
        useCase = new DownloadGuides(mockBrowserProvider, mockCourseRepo, mockAssetRepo, mockAssetStorage);
    });

    it('should skip download if guide already exists', async () => {
        mockAssetRepo.getPendingAssets.mockReturnValue([
            { id: 'g1', type: 'guide', metadata: { title: "Test Guide", ekitId: "ekit123", order_index: 1 }, url: 'http://g1' }
        ]);
        mockAssetRepo.getAssetById.mockReturnValue({ id: 'g1', type: 'guide', metadata: { ekitId: 'e1' } });
        mockAssetStorage.assetExists.mockReturnValue(true);

        await useCase.executeForCourse('c1');

        expect(mockAssetStorage.buildPDFFromImages).not.toHaveBeenCalled();
    });

    it('should process guides and download images to create PDF', async () => {
        const mockPage = {
            goto: vi.fn(),
            waitForTimeout: vi.fn(),
            waitForSelector: vi.fn().mockResolvedValue({ getAttribute: vi.fn().mockResolvedValue('http://iframe-src') }),
            evaluate: vi.fn()
                .mockResolvedValueOnce(5) // pagesCount
                .mockResolvedValue([255, 216, 255]), // mock buffer array for all pages
            close: vi.fn().mockResolvedValue(undefined),
        } as any;
        const mockContext = { 
            newPage: vi.fn().mockResolvedValue(mockPage), 
            close: vi.fn() 
        } as any;
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
});
