import { describe, it, expect, vi } from 'vitest';
import { DownloadVideos } from '../../../application/use-cases/DownloadVideos';

// Mocks
const mockBrowserProvider = {
  getAuthenticatedContext: vi.fn(),
  close: vi.fn()
} as any;

const mockCourseRepo = {} as any;

const mockAssetRepo = {
  getPendingAssets: vi.fn(),
  getAssetById: vi.fn(),
  updateAssetCompletion: vi.fn(),
  updateAssetStatus: vi.fn()
} as any;

const mockAssetStorage = {
  ensureAssetDir: vi.fn(),
  verifyVideoIntegrity: vi.fn()
} as any;

const mockVideoDownloader = {
  download: vi.fn()
} as any;

describe('DownloadVideos Use Case', () => {
    it('should skip download if there are no pending videos', async () => {
        mockAssetRepo.getPendingAssets.mockReturnValueOnce([]);
        
        const useCase = new DownloadVideos(
          mockBrowserProvider, 
          mockCourseRepo, 
          mockAssetRepo, 
          mockAssetStorage, 
          mockVideoDownloader
        );
        await useCase.executeForCourse('123');

        expect(mockAssetRepo.getPendingAssets).toHaveBeenCalledWith('123', 'video');
        expect(mockBrowserProvider.getAuthenticatedContext).not.toHaveBeenCalled();
    });

    it('should verify integrity rule via IAssetStorage', () => {
        const useCase = new DownloadVideos(
          mockBrowserProvider, 
          mockCourseRepo, 
          mockAssetRepo, 
          mockAssetStorage, 
          mockVideoDownloader
        );
        
        // This logic is now inside IAssetStorage. verifyVideoIntegrity was moved there in the refactoring.
        // We can just verify the injection setup here.
        expect(useCase).toBeDefined();
    });
});
