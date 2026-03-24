import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ILogger } from '@my-offline-lms/core/logging';

import { AssetNamingService } from '@features/asset-download/infrastructure/AssetNamingService';
import { DownloadVideos } from '@features/asset-download/application/DownloadVideos';

describe('DownloadVideos Use Case', () => {
  let callCount = 0;
  let mockBrowserProvider: any;
  let mockCourseRepo: any;
  let mockAssetRepo: any;
  let mockAssetStorage: any;
  let mockVideoDownloader: any;
  let mockContextLogger: ILogger;
  let mockRootLogger: any;
  let mockPage: any;
  let mockContext: any;
  let useCase: DownloadVideos;

  beforeEach(() => {
    vi.clearAllMocks();
    callCount = 0;

    mockBrowserProvider = {
      getAuthenticatedContext: vi.fn(),
      close: vi.fn().mockResolvedValue(undefined)
    };

    mockCourseRepo = {
      getCourseById: vi.fn().mockReturnValue({ title: 'Test Course' })
    };

    mockAssetRepo = {
      getPendingAssets: vi.fn(),
      getAssetById: vi.fn(),
      updateAssetCompletion: vi.fn(),
      updateAssetStatus: vi.fn(),
    };

    mockAssetStorage = {
      ensureAssetDir: vi.fn().mockReturnValue('/mock/videos'),
      assetExists: vi.fn(),
      verifyVideoIntegrity: vi.fn(),
    };

    mockVideoDownloader = {
      download: vi.fn().mockImplementation(() => {
        callCount++;
        return Promise.resolve();
      })
    };

    mockContextLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      withContext: vi.fn().mockReturnThis()
    };

    mockRootLogger = {
      withContext: vi.fn().mockReturnValue(mockContextLogger)
    };

    mockPage = {
      goto: vi.fn().mockResolvedValue(undefined),
      waitForTimeout: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
      url: vi.fn().mockReturnValue('http://mock-url'),
      title: vi.fn().mockResolvedValue('Mock Title'),
      on: vi.fn(),
      $: vi.fn().mockResolvedValue({ click: vi.fn() }),
      locator: vi.fn().mockReturnValue({
        first: vi.fn().mockReturnThis(),
        getAttribute: vi.fn().mockResolvedValue('mock-attr'),
        isVisible: vi.fn().mockResolvedValue(true),
        waitFor: vi.fn().mockResolvedValue(undefined),
        click: vi.fn().mockResolvedValue(undefined)
      })
    };

    mockContext = {
      newPage: vi.fn().mockResolvedValue(mockPage),
      close: vi.fn().mockResolvedValue(undefined)
    };

    // Mock global setTimeout to avoid delays in tests
    vi.spyOn(global, 'setTimeout').mockImplementation((fn: any) => {
      if (typeof fn === 'function') fn();
      return { unref: () => { } } as any;
    });

    useCase = new DownloadVideos({
      browserProvider: mockBrowserProvider,
      courseRepository: mockCourseRepo,
      assetRepository: mockAssetRepo,
      assetStorage: mockAssetStorage,
      videoDownloader: mockVideoDownloader,
      namingService: new AssetNamingService(),
      logger: mockRootLogger,
      config: {
        selectors: {
          video: {
            startBtn: '.start',
            playBtn: '.play'
          }
        }
      }
    });
  });

  it('should return early if no pending videos', async () => {
    mockAssetRepo.getPendingAssets.mockReturnValue([]);
    await useCase.execute({ courseId: '123' });
    expect(mockContextLogger.info).toHaveBeenCalled();
    expect(mockBrowserProvider.getAuthenticatedContext).not.toHaveBeenCalled();
  });

  it('should skip if video already has integrity', async () => {
    const mockAsset = { id: 'v1', url: 'http://v1', type: 'video', metadata: { title: "V1", order_index: 1 }, courseId: '123' };
    mockAssetRepo.getPendingAssets.mockReturnValue([mockAsset]);
    mockAssetRepo.getAssetById.mockReturnValue(mockAsset);
    mockAssetStorage.verifyVideoIntegrity.mockReturnValue(true);

    await useCase.execute({ courseId: '123' });

    expect(mockAssetRepo.updateAssetCompletion).toHaveBeenCalled();
    expect(mockVideoDownloader.download).not.toHaveBeenCalled();
  });

  it('should process pending videos and download them successfully', async () => {
    const mockAsset = { id: 'v1', url: 'http://v1', type: 'video', metadata: { title: "Video 1", order_index: 1 }, courseId: '123' };
    mockAssetRepo.getPendingAssets.mockReturnValue([mockAsset]);
    mockAssetRepo.getAssetById.mockReturnValue(mockAsset);
    mockBrowserProvider.getAuthenticatedContext.mockResolvedValue(mockContext);

    mockAssetStorage.verifyVideoIntegrity.mockReturnValueOnce(false).mockReturnValueOnce(true);

    await useCase.execute({ courseId: '123' });

    expect(callCount).toBeGreaterThan(0);
    expect(mockAssetRepo.updateAssetStatus).toHaveBeenCalledWith('v1', 'DOWNLOADING');
    expect(mockAssetRepo.updateAssetCompletion).toHaveBeenCalled();
  });

  it('should detect m3u8 url from network requests', async () => {
    const mockAsset = { id: 'v1', url: 'http://v1', type: 'video', metadata: { title: "V1", order_index: 1 }, courseId: '123' };
    mockAssetRepo.getPendingAssets.mockReturnValue([mockAsset]);
    mockAssetRepo.getAssetById.mockReturnValue(mockAsset);
    mockBrowserProvider.getAuthenticatedContext.mockResolvedValue(mockContext);
    mockAssetStorage.verifyVideoIntegrity.mockReturnValueOnce(false).mockReturnValueOnce(true);

    let requestListener: any = null;
    mockPage.on.mockImplementation((event: string, listener: any) => {
      if (event === 'request') requestListener = listener;
    });

    mockPage.goto.mockImplementation(async () => {
      if (requestListener) {
        requestListener({ url: () => 'http://stream.m3u8' });
      }
      return undefined;
    });

    await useCase.execute({ courseId: '123' });

    expect(mockVideoDownloader.download).toHaveBeenCalledWith('http://stream.m3u8', expect.anything(), 'http://v1');
  });

  it('should handle download errors', async () => {
    const mockAsset = { id: 'v1', url: 'http://v1', type: 'video', metadata: { title: "Video 1", order_index: 1 }, courseId: '123' };
    mockAssetRepo.getPendingAssets.mockReturnValue([mockAsset]);
    mockAssetRepo.getAssetById.mockReturnValue(mockAsset);
    mockBrowserProvider.getAuthenticatedContext.mockResolvedValue(mockContext);
    mockAssetStorage.verifyVideoIntegrity.mockReturnValue(false);

    mockVideoDownloader.download.mockRejectedValue(new Error('Downloader failed'));

    await useCase.execute({ courseId: '123' });

    expect(mockAssetRepo.updateAssetStatus).toHaveBeenCalledWith('v1', 'FAILED');
    expect(mockContextLogger.error).toHaveBeenCalled();
  });

  it('should handle integrity failure after download', async () => {
    const mockAsset = { id: 'v1', url: 'http://v1', type: 'video', metadata: { title: "Video 1", order_index: 1 }, courseId: '123' };
    mockAssetRepo.getPendingAssets.mockReturnValue([mockAsset]);
    mockAssetRepo.getAssetById.mockReturnValue(mockAsset);
    mockBrowserProvider.getAuthenticatedContext.mockResolvedValue(mockContext);

    mockAssetStorage.verifyVideoIntegrity.mockImplementation(() => false);

    await useCase.execute({ courseId: '123' });

    expect(mockAssetRepo.updateAssetStatus).toHaveBeenCalledWith('v1', 'FAILED');
    expect(mockContextLogger.warn).toHaveBeenCalled();
  });

  it('should close resources properly', async () => {
    const mockAsset = { id: 'v1', url: 'http://v1', type: 'video', metadata: { title: "V1", order_index: 1 }, courseId: '123' };
    mockAssetRepo.getAssetById.mockReturnValue(mockAsset);
    mockBrowserProvider.getAuthenticatedContext.mockResolvedValue(mockContext);
    mockAssetStorage.verifyVideoIntegrity.mockReturnValue(false);

    // Test with sharedContext
    await useCase.downloadSingleVideo('v1', '123', mockContext);
    expect(mockPage.close).toHaveBeenCalled();

    // Test without sharedContext
    mockBrowserProvider.getAuthenticatedContext.mockResolvedValue(mockContext);
    mockAssetStorage.verifyVideoIntegrity.mockReturnValue(false);

    await useCase.downloadSingleVideo('v1', '123');
    expect(mockBrowserProvider.close).toHaveBeenCalled();
  });

  it('should throw error if redirected to login page', async () => {
    const mockAsset = { id: 'v1', url: 'http://v1', type: 'video', metadata: { title: "V1", order_index: 1 }, courseId: '123' };
    mockAssetRepo.getAssetById.mockReturnValue(mockAsset);
    mockBrowserProvider.getAuthenticatedContext.mockResolvedValue(mockContext);
    mockAssetStorage.verifyVideoIntegrity.mockReturnValue(false);

    mockPage.url.mockReturnValue('https://identity.oraclecloud.com/ui/v1/signin');

    await useCase.downloadSingleVideo('v1', '123');

    expect(mockAssetRepo.updateAssetStatus).toHaveBeenCalledWith('v1', 'FAILED');
    expect(mockContextLogger.error).toHaveBeenCalledWith(expect.stringContaining('❌ Error extrayendo vídeo v1:'), expect.any(Error));
  });

  it('should handle page.close() failure in finally block when goto fails', async () => {
    const mockAsset = { id: 'v1', url: 'http://v1', type: 'video', metadata: { title: "V1", order_index: 1 }, courseId: '123' };
    mockAssetRepo.getAssetById.mockReturnValue(mockAsset);
    mockBrowserProvider.getAuthenticatedContext.mockResolvedValue(mockContext);
    mockAssetStorage.verifyVideoIntegrity.mockReturnValue(false); // Ensure it tries to download

    mockPage.goto.mockRejectedValue(new Error('Page navigation failed'));
    mockPage.close.mockRejectedValue(new Error('Page close failed'));

    // Should not throw and should still update status to FAILED
    await useCase.downloadSingleVideo('v1', '123');
    expect(mockAssetRepo.updateAssetStatus).toHaveBeenCalledWith('v1', 'FAILED');
    expect(mockContextLogger.error).toHaveBeenCalledWith(expect.stringContaining('Error extrayendo vídeo v1:'), expect.any(Error));
  });

  it('should log debug if buttons are not found', async () => {
    const mockAsset = { id: 'v1', url: 'http://v1', type: 'video', metadata: { title: "V1", order_index: 1 }, courseId: '123' };
    mockAssetRepo.getAssetById.mockReturnValue(mockAsset);
    mockBrowserProvider.getAuthenticatedContext.mockResolvedValue(mockContext);
    mockAssetStorage.verifyVideoIntegrity.mockReturnValueOnce(false).mockReturnValueOnce(true);

    // Mock locator to fail for buttons
    mockPage.locator.mockReturnValue({
      first: vi.fn().mockReturnThis(),
      waitFor: vi.fn().mockRejectedValue(new Error('not found')),
    });

    await useCase.downloadSingleVideo('v1', '123');

    expect(mockContextLogger.debug).toHaveBeenCalledWith(expect.stringContaining("Botón 'Start Learning' no encontrado"));
    expect(mockContextLogger.debug).toHaveBeenCalledWith(expect.stringContaining("Botón 'Play' no encontrado"));
  });

  it('should handle page close failure in finally block', async () => {
    const mockAsset = { id: 'v1', url: 'http://v1', type: 'video', metadata: { title: "V1", order_index: 1 }, courseId: '123' };
    mockAssetRepo.getAssetById.mockReturnValue(mockAsset);
    mockBrowserProvider.getAuthenticatedContext.mockResolvedValue(mockContext);
    mockAssetStorage.verifyVideoIntegrity.mockReturnValueOnce(false).mockReturnValueOnce(true);

    mockPage.close.mockRejectedValue(new Error('close failed'));

    await useCase.downloadSingleVideo('v1', '123');

    // Should still finish without crashing, and status should be FAILED because page.close() failed earlier
    expect(mockAssetRepo.updateAssetStatus).toHaveBeenCalledWith('v1', 'FAILED');
  });

  it('should detect the .mpd stream', async () => {
    const mockAsset = { id: 'v1', url: 'http://v1', type: 'video', metadata: { title: "V1" }, courseId: '123' };
    mockAssetRepo.getAssetById.mockReturnValue(mockAsset);
    mockBrowserProvider.getAuthenticatedContext.mockResolvedValue(mockContext);
    mockAssetStorage.verifyVideoIntegrity.mockReturnValueOnce(false).mockReturnValueOnce(true);

    let requestListener: any = null;
    mockPage.on.mockImplementation((event: string, listener: any) => {
      if (event === 'request') requestListener = listener;
    });

    mockPage.goto.mockImplementation(async () => {
      if (requestListener) {
        requestListener({ url: () => 'http://stream.mpd' });
      }
      return undefined;
    });

    await useCase.downloadSingleVideo('v1', '123');
    expect(mockVideoDownloader.download).toHaveBeenCalledWith('http://stream.mpd', expect.anything(), 'http://v1');
  });

  it('should ignore subsequent stream detections', async () => {
    const mockAsset = { id: 'v1', url: 'http://v1', type: 'video', metadata: { title: "V1" }, courseId: '123' };
    mockAssetRepo.getAssetById.mockReturnValue(mockAsset);
    mockBrowserProvider.getAuthenticatedContext.mockResolvedValue(mockContext);
    mockAssetStorage.verifyVideoIntegrity.mockReturnValueOnce(false).mockReturnValueOnce(true);

    let requestListener: any = null;
    mockPage.on.mockImplementation((event: string, listener: any) => {
      if (event === 'request') requestListener = listener;
    });

    mockPage.goto.mockImplementation(async () => {
      if (requestListener) {
        requestListener({ url: () => 'http://first.m3u8' });
        requestListener({ url: () => 'http://second.m3u8' });
      }
      return undefined;
    });

    await useCase.downloadSingleVideo('v1', '123');
    expect(mockVideoDownloader.download).toHaveBeenCalledWith('http://first.m3u8', expect.anything(), 'http://v1');
  });

  it('should return if asset type is not video', async () => {
    const mockAsset = { id: 'v1', type: 'guide' as any };
    mockAssetRepo.getAssetById.mockReturnValue(mockAsset);
    await useCase.downloadSingleVideo('v1', '123');
    expect(mockBrowserProvider.getAuthenticatedContext).not.toHaveBeenCalled();
  });

  it('should handle videoId without slashes (unusual case)', async () => {
    const mockAsset = { id: 'v1', url: 'v1', type: 'video', metadata: { title: "V1" }, courseId: '123' };
    mockAssetRepo.getAssetById.mockReturnValue(mockAsset);
    mockBrowserProvider.getAuthenticatedContext.mockResolvedValue(mockContext);
    mockAssetStorage.verifyVideoIntegrity.mockReturnValueOnce(false).mockReturnValueOnce(true);

    await useCase.downloadSingleVideo('v1', '123');
    expect(mockPage.locator).toHaveBeenCalled(); // still tries to process
  });
});
