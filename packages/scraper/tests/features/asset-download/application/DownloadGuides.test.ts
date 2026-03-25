import { describe, it, expect, vi, beforeEach, Mocked } from 'vitest';

import { AssetNamingService } from '@features/asset-download/infrastructure/AssetNamingService';
import { IPlatformUrlProvider } from '@features/platform-sync/domain/ports/IPlatformUrlProvider';
import { ILogger } from '@my-offline-lms/core/logging';
import { DownloadGuides } from '@features/asset-download/application/DownloadGuides';
import { IAssetStorage } from '@features/asset-download/domain/ports/IAssetStorage';

describe('DownloadGuides Use Case', () => {
  let mockBrowserProvider: any;
  let mockCourseRepo: any;
  let mockAssetRepo: any;
  let mockAssetStorage: Mocked<IAssetStorage>;
  let mockLogger: Mocked<ILogger>;
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
      verifyVideoIntegrity: vi.fn(),
      ensureAssetDir: vi.fn(),
      ensureTempDir: vi.fn().mockResolvedValue('/mock/temp'),
      assetExists: vi.fn(),
      writeTempImage: vi.fn(),
      getTempImageSize: vi.fn().mockResolvedValue(0),
      buildPDFFromImages: vi.fn().mockResolvedValue(undefined),
      removeTempDir: vi.fn().mockResolvedValue(undefined),
      findExistingAsset: vi.fn(),
    };

    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      withContext: vi.fn().mockReturnThis(),
    };

    const mockUrlProvider: Mocked<IPlatformUrlProvider> = {
      resolveCourseUrl: vi.fn(url => ({ url, courseId: '123' })),
      resolveLearningPathUrl: vi.fn(url => ({ url, pathId: '123' })),
      getCourseUrl: vi.fn(({ slug, id }) => `url://${slug}/${id}`),
      getGuideViewerUrl: vi.fn().mockReturnValue('http://mock-viewer'),
      getVideoAssetUrl: vi.fn().mockReturnValue('http://mock-video'),
      getGuideImageBaseUrl: vi.fn(src => src.replace('/mobile/index.html', '/files/mobile/')),
    };

    // Mock global setTimeout to avoid delays in tests
    vi.spyOn(global, 'setTimeout').mockImplementation((fn: any) => {
      if (typeof fn === 'function') fn();
      return { unref: () => { } } as any;
    });

    useCase = new DownloadGuides({
      browserProvider: mockBrowserProvider,
      courseRepo: mockCourseRepo,
      assetRepo: mockAssetRepo,
      assetStorage: mockAssetStorage,
      namingService: new AssetNamingService(),
      urlProvider: mockUrlProvider,
      logger: mockLogger,
      config: {
        keepTempImages: false,
        selectors: {
          iframe: 'iframe',
          flipbookPages: '.title'
        }
      }
    });
  });

  it('should return early if no pending guides', async () => {
    mockAssetRepo.getPendingAssets.mockReturnValue([]);
    await useCase.execute({ courseId: 'c1' });
    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('No hay guías pendientes'));
    expect(mockBrowserProvider.getAuthenticatedContext).not.toHaveBeenCalled();
  });

  it('should skip download if guide already exists', async () => {
    mockAssetRepo.getPendingAssets.mockReturnValue([
      { id: 'g1', type: 'guide', metadata: { name: "Test Guide", ekitId: "ekit123", order_index: 1, offeringId: 'off1' }, url: 'http://g1' }
    ]);
    mockAssetRepo.getAssetById.mockReturnValue({ id: 'g1', type: 'guide', metadata: { ekitId: 'e1', offeringId: 'off1' } });
    mockAssetStorage.assetExists.mockResolvedValue(true);
    mockAssetStorage.getTempImageSize.mockResolvedValue(100);

    await useCase.execute({ courseId: 'c1' });

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
      { id: 'g1', type: 'guide', metadata: { name: "Test Guide", ekitId: "ekit123", order_index: 1, offeringId: 'off1' }, courseId: 'c1' }
    ]);
    mockAssetRepo.getAssetById.mockReturnValue({
      id: 'g1',
      type: 'guide',
      metadata: { name: "Test Guide", ekitId: "ekit123", order_index: 1, offeringId: 'off1' },
      courseId: 'c1'
    });
    mockAssetStorage.assetExists.mockResolvedValue(false);
    mockAssetStorage.buildPDFFromImages.mockResolvedValue(undefined);

    await useCase.execute({ courseId: 'c1' });

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

    mockAssetRepo.getPendingAssets.mockReturnValue([{ id: 'g1', type: 'guide', metadata: { ekitId: 'e1', offeringId: 'off1' }, courseId: 'c1' }]);
    mockAssetRepo.getAssetById.mockReturnValue({ id: 'g1', type: 'guide', metadata: { ekitId: 'e1', offeringId: 'off1' } });

    await useCase.execute({ courseId: 'c1' });

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

    mockAssetRepo.getPendingAssets.mockReturnValue([{ id: 'g1', type: 'guide', metadata: { ekitId: 'e1', offeringId: 'off1' }, courseId: 'c1' }]);
    mockAssetRepo.getAssetById.mockReturnValue({ id: 'g1', type: 'guide', metadata: { ekitId: 'e1', offeringId: 'off1' } });

    await useCase.execute({ courseId: 'c1' });

    expect(mockAssetRepo.updateAssetStatus).toHaveBeenCalledWith('g1', 'FAILED');
  });

  it('should remove temp dir if keepTempImages is false', async () => {
    const mockPage = {
      goto: vi.fn().mockResolvedValue(undefined),
      waitForTimeout: vi.fn(),
      waitForSelector: vi.fn().mockResolvedValue({ getAttribute: vi.fn().mockResolvedValue('http://iframe-src') }),
      evaluate: vi.fn().mockResolvedValueOnce(1).mockResolvedValueOnce([1, 2, 3]),
      close: vi.fn().mockResolvedValue(undefined),
    };
    const mockContext = { newPage: vi.fn().mockResolvedValue(mockPage), close: vi.fn() };
    mockBrowserProvider.getAuthenticatedContext.mockResolvedValue(mockContext);

    mockAssetRepo.getPendingAssets.mockReturnValue([{ id: 'g1', type: 'guide', metadata: { ekitId: 'e1', offeringId: 'off1' }, courseId: 'c1' }]);
    mockAssetRepo.getAssetById.mockReturnValue({ id: 'g1', type: 'guide', metadata: { ekitId: 'e1', name: 'T', offeringId: 'off1' } });

    await useCase.execute({ courseId: 'c1' });

    expect(mockAssetStorage.removeTempDir).toHaveBeenCalled();
  });

  it('should NOT remove temp dir if keepTempImages is true', async () => {
    const customUseCase = new DownloadGuides({
      ...useCase as any,
      config: { ... (useCase as any).config, keepTempImages: true }
    });
    const mockPage = {
      goto: vi.fn().mockResolvedValue(undefined),
      waitForTimeout: vi.fn(),
      waitForSelector: vi.fn().mockResolvedValue({ getAttribute: vi.fn().mockResolvedValue('http://iframe-src') }),
      evaluate: vi.fn().mockResolvedValueOnce(1).mockResolvedValueOnce([1, 2, 3]),
      close: vi.fn().mockResolvedValue(undefined),
    };
    const mockContext = { newPage: vi.fn().mockResolvedValue(mockPage), close: vi.fn() };
    mockBrowserProvider.getAuthenticatedContext.mockResolvedValue(mockContext);

    mockAssetRepo.getPendingAssets.mockReturnValue([{ id: 'g1', type: 'guide', metadata: { ekitId: 'e1', offeringId: 'off1' }, courseId: 'c1' }]);
    mockAssetRepo.getAssetById.mockReturnValue({ id: 'g1', type: 'guide', metadata: { ekitId: 'e1', name: 'T', offeringId: 'off1' } });

    await customUseCase.execute({ courseId: 'c1' });

    expect(mockAssetStorage.removeTempDir).not.toHaveBeenCalled();
  });

  it('should close browser provider if sharedContext is null', async () => {
    const mockPage = {
      goto: vi.fn().mockResolvedValue(undefined),
      waitForTimeout: vi.fn(),
      waitForSelector: vi.fn().mockResolvedValue({ getAttribute: vi.fn().mockResolvedValue('http://iframe-src') }),
      evaluate: vi.fn().mockResolvedValueOnce(1).mockResolvedValueOnce([1, 2, 3]),
      close: vi.fn().mockResolvedValue(undefined),
    };
    const mockContext = { newPage: vi.fn().mockResolvedValue(mockPage), close: vi.fn() };
    mockBrowserProvider.getAuthenticatedContext.mockResolvedValue(mockContext);

    mockAssetRepo.getAssetById.mockReturnValue({ id: 'g1', type: 'guide', metadata: { ekitId: 'e1', name: 'T', offeringId: 'off1' } });

    await useCase.downloadSingleGuide({ assetId: 'g1', courseId: 'c1' });

    expect(mockBrowserProvider.close).toHaveBeenCalled();
  });

  it('should NOT close browser provider if sharedContext is provided', async () => {
    const mockPage = {
      goto: vi.fn().mockResolvedValue(undefined),
      waitForTimeout: vi.fn(),
      waitForSelector: vi.fn().mockResolvedValue({ getAttribute: vi.fn().mockResolvedValue('http://iframe-src') }),
      evaluate: vi.fn().mockResolvedValueOnce(1).mockResolvedValueOnce([1, 2, 3]),
      close: vi.fn().mockResolvedValue(undefined),
    };
    const mockContext = { newPage: vi.fn().mockResolvedValue(mockPage), close: vi.fn() };

    mockAssetRepo.getAssetById.mockReturnValue({ id: 'g1', type: 'guide', metadata: { ekitId: 'e1', name: 'T', offeringId: 'off1' } });

    await useCase.downloadSingleGuide({ assetId: 'g1', courseId: 'c1', sharedContext: mockContext });

    expect(mockBrowserProvider.close).not.toHaveBeenCalled();
    expect(mockPage.close).toHaveBeenCalled(); // Should close page but not provider
  });

  it('should throw error if zero pages detected', async () => {
    const mockPage = {
      goto: vi.fn().mockResolvedValue(undefined),
      waitForTimeout: vi.fn(),
      waitForSelector: vi.fn().mockResolvedValue({ getAttribute: vi.fn().mockResolvedValue('http://iframe-src') }),
      evaluate: vi.fn().mockResolvedValue(0), // No pages
      close: vi.fn().mockResolvedValue(undefined),
    };
    const mockContext = { newPage: vi.fn().mockResolvedValue(mockPage), close: vi.fn() };
    mockBrowserProvider.getAuthenticatedContext.mockResolvedValue(mockContext);
    mockAssetRepo.getAssetById.mockReturnValue({ id: 'g1', type: 'guide', metadata: { ekitId: 'e1', offeringId: 'off1' } });

    await useCase.downloadSingleGuide({ assetId: 'g1', courseId: 'c1' });
    expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('❌ Error extrayendo guía:'), expect.any(Error));
  });

  it('should test static extractHighestPageNumber branches', () => {
    // Mock document.querySelectorAll
    const mockElement1 = { textContent: '1-5' } as any;
    const mockElement2 = { textContent: null } as any;
    const mockElement3 = { textContent: 'invalid' } as any;

    vi.stubGlobal('document', {
      querySelectorAll: vi.fn().mockReturnValue([mockElement1, mockElement2, mockElement3])
    });

    const result = DownloadGuides.extractHighestPageNumber('.title');
    expect(result).toBe(5);
    vi.unstubAllGlobals();
  });

  it('should skip downloading page if it already exists in temp storage', async () => {
    const mockPage = {
      goto: vi.fn().mockResolvedValue(undefined),
      waitForTimeout: vi.fn(),
      waitForSelector: vi.fn().mockResolvedValue({ getAttribute: vi.fn().mockResolvedValue('http://iframe-src') }),
      evaluate: vi.fn().mockResolvedValueOnce(1), // 1 page
      close: vi.fn().mockResolvedValue(undefined),
    };
    const mockContext = { newPage: vi.fn().mockResolvedValue(mockPage), close: vi.fn() };
    mockBrowserProvider.getAuthenticatedContext.mockResolvedValue(mockContext);
    mockAssetRepo.getAssetById.mockReturnValue({ id: 'g1', type: 'guide', metadata: { ekitId: 'e1', name: 'T', offeringId: 'off1' } });

    // First call for assetExists(outputPath) -> false
    // Second call for cachedImgPath -> true
    mockAssetStorage.assetExists.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    mockAssetStorage.getTempImageSize.mockResolvedValue(500);

    await useCase.downloadSingleGuide({ assetId: 'g1', courseId: 'c1' });

    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Saltando pág 1/1 (Ya existe en caché)'));
    expect(mockPage.goto).not.toHaveBeenCalledWith(expect.stringContaining('.jpg'), expect.any(Object));
  });

  it('should return early if asset not found or not a guide', async () => {
    mockAssetRepo.getAssetById.mockReturnValue(null);
    await useCase.downloadSingleGuide({ assetId: 'nonexistent', courseId: 'c1' });
    expect(mockAssetStorage.ensureAssetDir).not.toHaveBeenCalled();

    mockAssetRepo.getAssetById.mockReturnValue({ type: 'video' });
    await useCase.downloadSingleGuide({ assetId: 'v1', courseId: 'c1' });
    expect(mockAssetStorage.ensureAssetDir).not.toHaveBeenCalled();
  });

  it('should return early if ekitId is missing', async () => {
    mockAssetRepo.getAssetById.mockReturnValue({ id: 'g1', type: 'guide', metadata: {} });
    await useCase.downloadSingleGuide({ assetId: 'g1', courseId: 'c1' });
    expect(mockAssetStorage.ensureAssetDir).not.toHaveBeenCalled();
  });

  it('should throw error if offeringId is missing', async () => {
    const mockPage = { close: vi.fn() };
    const mockContext = { newPage: vi.fn().mockResolvedValue(mockPage), close: vi.fn() };
    mockBrowserProvider.getAuthenticatedContext.mockResolvedValue(mockContext);
    mockAssetRepo.getAssetById.mockReturnValue({ id: 'g1', type: 'guide', metadata: { ekitId: 'e1' } });

    await useCase.downloadSingleGuide({ assetId: 'g1', courseId: 'c1' });

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('❌ Error extrayendo guía:'),
      expect.any(Error)
    );
    expect(mockAssetRepo.updateAssetStatus).toHaveBeenCalledWith('g1', 'FAILED');
  });

  describe('Static Methods', () => {
    it('extractHighestPageNumber should correctly extract page count from DOM', () => {
      const mockElements = [
        { textContent: '1-10' },
        { textContent: '11-20' },
        { textContent: 'invalid' },
      ];
      vi.stubGlobal('document', {
        querySelectorAll: vi.fn().mockReturnValue(mockElements)
      });

      const result = DownloadGuides.extractHighestPageNumber('.selector');
      expect(result).toBe(20);
      vi.unstubAllGlobals();
    });

    it('downloadImageAsArray should fetch and convert to array', async () => {
      const mockBuffer = new Uint8Array([1, 2, 3]).buffer;
      const mockBlob = {
        arrayBuffer: vi.fn().mockResolvedValue(mockBuffer)
      };
      const mockResponse = {
        blob: vi.fn().mockResolvedValue(mockBlob)
      };
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));

      // FileReader mock
      const mockFileReader = {
        readAsArrayBuffer: vi.fn(function (this: any) {
          this.result = mockBuffer;
          if (this.onload) this.onload();
        }),
        result: null,
        onload: null,
      };
      vi.stubGlobal('FileReader', vi.fn().mockImplementation(function (this: any) {
        return mockFileReader;
      }));
      vi.stubGlobal('Uint8Array', Uint8Array);

      const result = await DownloadGuides.downloadImageAsArray('http://test.com');
      expect(result).toEqual([1, 2, 3]);
      vi.unstubAllGlobals();
    });
  });

  describe('PDF Transformation & Filename Recognition', () => {
    const courseId = '77517';
    const assetId = 'pdf_61371';
    const tempDir = `/mock/temp/${courseId}/${assetId}`;
    const outputDir = `/mock/assets/${courseId}/guides`;
    const filename = '01_Test_Guide.pdf';
    const outputPath = `${outputDir}/${filename}`;

    it('should complete PDF transformation from existing temporary images', async () => {
      // Arrange
      const asset = {
        id: assetId,
        courseId: courseId,
        type: 'guide',
        metadata: {
          name: 'Test Guide',
          ekitId: 'ekit-123',
          order_index: 1,
          offeringId: 'off-456'
        }
      };
      mockAssetRepo.getAssetById.mockReturnValue(asset);
      mockAssetStorage.ensureTempDir.mockResolvedValue(tempDir);
      mockAssetStorage.ensureAssetDir.mockResolvedValue(outputDir);

      // Simulate that the output PDF DOES NOT exist yet
      mockAssetStorage.assetExists.mockImplementation((path: string) => {
        if (path === outputPath) return Promise.resolve(false);
        if (path.includes('page_')) return Promise.resolve(true); // Images exist
        return Promise.resolve(false);
      });

      mockAssetStorage.getTempImageSize.mockResolvedValue(1000);

      // Mock browser interactions
      const mockPage = {
        goto: vi.fn().mockResolvedValue(undefined),
        waitForTimeout: vi.fn(),
        waitForSelector: vi.fn().mockResolvedValue({ getAttribute: vi.fn().mockResolvedValue('http://iframe-src') }),
        evaluate: vi.fn().mockResolvedValueOnce(2), // 2 pages total
        close: vi.fn().mockResolvedValue(undefined),
      };
      const mockContext = {
        newPage: vi.fn().mockResolvedValue(mockPage),
        close: vi.fn()
      };
      mockBrowserProvider.getAuthenticatedContext.mockResolvedValue(mockContext);

      // Act
      await useCase.downloadSingleGuide({ assetId, courseId });

      // Assert
      expect(mockAssetStorage.assetExists).toHaveBeenCalledWith(expect.stringContaining('page_0001.png'));
      expect(mockPage.evaluate).not.toHaveBeenCalledWith(expect.any(Function), expect.stringContaining('.jpg'));
      expect(mockAssetStorage.buildPDFFromImages).toHaveBeenCalledWith(tempDir, outputPath);
      expect(mockAssetRepo.updateAssetCompletion).toHaveBeenCalledWith(
        assetId,
        expect.objectContaining({ filename }),
        outputPath
      );
    });

    it('should complete even if some images are missing but then downloaded', async () => {
      // Arrange
      const asset = {
        id: assetId,
        courseId: courseId,
        type: 'guide',
        metadata: {
          name: 'Test Guide',
          ekitId: 'ekit-123',
          order_index: 1,
          offeringId: 'off-456'
        }
      };
      mockAssetRepo.getAssetById.mockReturnValue(asset);
      mockAssetStorage.ensureTempDir.mockResolvedValue(tempDir);
      mockAssetStorage.ensureAssetDir.mockResolvedValue(outputDir);

      mockAssetStorage.assetExists.mockImplementation((path: string) => {
        if (path === outputPath) return Promise.resolve(false);
        if (path.includes('page_0001')) return Promise.resolve(true); // Page 1 exists
        if (path.includes('page_0002')) return Promise.resolve(false); // Page 2 missing
        return Promise.resolve(false);
      });

      mockAssetStorage.getTempImageSize.mockResolvedValue(1000);

      const mockPage = {
        goto: vi.fn().mockResolvedValue(undefined),
        waitForTimeout: vi.fn(),
        waitForSelector: vi.fn().mockResolvedValue({ getAttribute: vi.fn().mockResolvedValue('http://iframe-src') }),
        evaluate: vi.fn()
          .mockResolvedValueOnce(2) // 2 pages total
          .mockResolvedValueOnce([1, 2, 3]), // Page 2 download buffer
        close: vi.fn().mockResolvedValue(undefined),
      };
      const mockContext = {
        newPage: vi.fn().mockResolvedValue(mockPage),
        close: vi.fn()
      };
      mockBrowserProvider.getAuthenticatedContext.mockResolvedValue(mockContext);

      // Act
      await useCase.downloadSingleGuide({ assetId, courseId });

      // Assert
      expect(mockAssetStorage.writeTempImage).toHaveBeenCalled();
      expect(mockAssetStorage.buildPDFFromImages).toHaveBeenCalled();
      expect(mockAssetRepo.updateAssetCompletion).toHaveBeenCalled();
    });

    it('should skip download if PDF already exists with original filename (meta.filename)', async () => {
      // Arrange
      const originalFilename = 'D106548GC10_sg.pdf';
      const asset = {
        id: assetId,
        courseId: courseId,
        type: 'guide',
        metadata: {
          name: 'Test Guide',
          ekitId: 'ekit-123',
          order_index: 1,
          offeringId: 'off-456',
          filename: originalFilename
        }
      };
      mockAssetRepo.getAssetById.mockReturnValue(asset);

      const existingPath = `/external/path/${courseId}/guides/${originalFilename}`;
      mockAssetStorage.findExistingAsset.mockResolvedValue(existingPath);

      // Act
      await useCase.downloadSingleGuide({ assetId, courseId });

      // Assert
      expect(mockAssetStorage.findExistingAsset).toHaveBeenCalledWith(courseId, 'guide', originalFilename);
      expect(mockAssetRepo.updateAssetCompletion).toHaveBeenCalledWith(
        assetId,
        asset.metadata,
        existingPath
      );
      expect(mockBrowserProvider.getAuthenticatedContext).not.toHaveBeenCalled();
    });
    it('should use gcc and ekitType to generate original filename if available in metadata', async () => {
      // Arrange
      const courseId = '150265';
      const assetId = 'guide_123';
      const expectedFilename = 'D1111043GC10_sg.pdf';
      const expectedOutputPath = `/mock/assets/${courseId}/guides/${expectedFilename}`;

      const asset = {
        id: assetId,
        courseId: courseId,
        type: 'guide',
        metadata: {
          name: 'Test Guide',
          ekitId: 'ekit-123',
          order_index: 1,
          offeringId: 'off-456',
          gcc: 'D1111043GC10',
          ekitType: '1'
        }
      };
      mockAssetRepo.getAssetById.mockReturnValue(asset);
      mockAssetStorage.ensureAssetDir.mockResolvedValue(`/mock/assets/${courseId}/guides`);
      mockAssetStorage.ensureTempDir.mockResolvedValue(`/mock/temp/foo`);
      mockAssetStorage.assetExists.mockResolvedValue(false);

      const mockPage = {
        goto: vi.fn().mockResolvedValue(undefined),
        waitForTimeout: vi.fn(),
        waitForSelector: vi.fn().mockResolvedValue({ getAttribute: vi.fn().mockResolvedValue('http://iframe-src') }),
        evaluate: vi.fn().mockResolvedValueOnce(1).mockResolvedValueOnce([1, 2, 3]), // 1 page total, and image data
        close: vi.fn().mockResolvedValue(undefined),
      };
      const mockContext = {
        newPage: vi.fn().mockResolvedValue(mockPage),
        close: vi.fn()
      };
      mockBrowserProvider.getAuthenticatedContext.mockResolvedValue(mockContext);

      // Act
      await useCase.downloadSingleGuide({ assetId, courseId });

      // Assert
      expect(mockAssetStorage.buildPDFFromImages).toHaveBeenCalledWith(`/mock/temp/foo`, expectedOutputPath);
      expect(mockAssetRepo.updateAssetCompletion).toHaveBeenCalledWith(
        assetId,
        expect.objectContaining({ filename: expectedFilename }),
        expectedOutputPath
      );
    });
  });
});
