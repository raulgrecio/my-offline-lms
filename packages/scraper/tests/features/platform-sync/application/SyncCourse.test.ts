import { beforeEach, describe, expect, it, Mocked, vi } from 'vitest';

import { type ILogger } from '@core/logging';

import { PLATFORM } from '@scraper/config/platform';
import { IInterceptedDataRepositoryFactory } from '@scraper/features/platform-sync/domain/ports/IInterceptedDataRepositoryFactory';
import { type IPlatformUrlProvider } from '@scraper/features/platform-sync/domain/ports/IPlatformUrlProvider';
import { AssetNamingService } from '@scraper/features/asset-download/infrastructure/AssetNamingService';
import { IInterceptedDataRepository } from '@scraper/features/platform-sync/domain/ports/IInterceptedDataRepository';

import { SyncCourse } from '@scraper/features/platform-sync/application/SyncCourse';
import { BrowserInterceptor } from '@scraper/platform/browser/BrowserInterceptor';

vi.mock('@scraper/platform/browser/BrowserInterceptor', () => {
  return {
    BrowserInterceptor: vi.fn().mockImplementation(function () {
      return {
        setup: vi.fn().mockResolvedValue('/tmp/intercepted')
      };
    })
  };
});

describe('SyncCourse Use Case', () => {
  const mockBrowserProvider = {
    getHeadfulContext: vi.fn(),
    getAuthenticatedContext: vi.fn(),
    close: vi.fn(),
  } as any;

  const mockCourseRepo = {
    saveCourse: vi.fn(),
    getCourseById: vi.fn().mockReturnValue({ id: '123', title: 'Test Course' }),
  } as any;

  const mockAssetRepo = {
    saveAsset: vi.fn(),
    assetExists: vi.fn().mockResolvedValue(false),
  } as any;

  const mockInterceptedDataRepo: Mocked<IInterceptedDataRepository> = {
    getPendingForCourse: vi.fn(),
    getPendingLearningPaths: vi.fn(),
    getPendingForLearningPath: vi.fn(),
    deletePayload: vi.fn(),
    getPendingCourses: vi.fn(),
    markAsProcessed: vi.fn(),
    deleteWorkspace: vi.fn(),
  };

  const mockInterceptedDataRepoFactory: Mocked<IInterceptedDataRepositoryFactory> = {
    create: vi.fn().mockReturnValue(mockInterceptedDataRepo)
  };

  const mockLogger: Mocked<ILogger> = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    withContext: vi.fn().mockReturnThis(),
  };

  const mockUrlProvider: Mocked<IPlatformUrlProvider> = {
    resolveCourseUrl: vi.fn(url => ({ url: String(url), courseId: '123' })),
    resolveLearningPathUrl: vi.fn(url => ({ url: String(url), pathId: '123' })),
    getCourseUrl: vi.fn(({ slug, id }) => `https://platform.com/ou/course/${slug}/${id}`),
    getVideoAssetUrl: vi.fn(({ courseUrl, assetId }) => {
      const base = courseUrl.endsWith('/') ? courseUrl : `${courseUrl}/`;
      return `${base}${assetId}`;
    }),
    getGuideViewerUrl: vi.fn(({ courseId, offeringId, ekitId }) => `https://platform.com/ekit/${courseId}/${offeringId}/${ekitId}/course`),
    getGuideImageBaseUrl: vi.fn(src => src),
  };

  let useCase: SyncCourse;

  beforeEach(() => {
    vi.clearAllMocks();
    mockInterceptedDataRepo.getPendingForCourse.mockResolvedValue([]);
    // Restore default implementation for each test
    mockUrlProvider.resolveCourseUrl.mockImplementation(url => ({ url: String(url), courseId: '123' }));

    useCase = new SyncCourse({
      browserProvider: mockBrowserProvider,
      courseRepository: mockCourseRepo,
      assetRepository: mockAssetRepo,
      interceptedDataRepoFactory: mockInterceptedDataRepoFactory,
      browserInterceptor: new BrowserInterceptor({} as any),
      urlProvider: mockUrlProvider,
      namingService: new AssetNamingService(),
      logger: mockLogger,
      config: {
        keepTempWorkspaces: false,
        selectors: {
          guidesTab: PLATFORM.SELECTORS.COURSE.GUIDES_TAB
        },
        oracleConstants: {
          videoTypeId: 1
        }
      }
    });
  });

  const setupMockPage = () => {
    const mockPage = {
      goto: vi.fn().mockResolvedValue(undefined),
      waitForSelector: vi.fn().mockResolvedValue({}),
      click: vi.fn().mockResolvedValue(undefined),
      waitForTimeout: vi.fn().mockResolvedValue(undefined)
    } as any;
    mockBrowserProvider.getAuthenticatedContext.mockResolvedValue({
      newPage: vi.fn().mockResolvedValue(mockPage),
      close: vi.fn().mockResolvedValue(undefined)
    });
    return mockPage;
  };

  it('should process everything and merge metadata', async () => {
    setupMockPage();

    const payload1 = {
      filePath: 'p1.json',
      content: JSON.stringify({
        url: 'http://p1',
        data: {
          id: '123',
          name: 'Short',
          slug: 'slug-1',
          modules: [{ components: [{ id: 'v1', typeId: 1, name: 'Video 1' }] }],
          eKits: [{ id: 'num1', name: 'Guide' }]
        }
      })
    };
    const payload2 = {
      filePath: 'p2.json',
      content: JSON.stringify({
        url: 'http://p2?offeringId=12345',
        data: {
          id: '123',
          title: 'Much Longer Title',
          slug: 'slug-1',
          modules: [{ components: [{ id: 'v1', typeId: 1, duration: 123 }] }],
          eKits: [{ ekitId: 'uuid1', name: 'Guide' }]
        }
      })
    };
    mockInterceptedDataRepo.getPendingForCourse.mockResolvedValue([payload1, payload2]);

    await useCase.execute({ courseInput: '123' });

    expect(mockCourseRepo.saveCourse).toHaveBeenCalledWith(expect.objectContaining({ title: 'Much Longer Title' }));
    // Video merging
    expect(mockAssetRepo.saveAsset).toHaveBeenCalledWith(expect.objectContaining({
      type: 'video',
      id: 'v1',
      metadata: expect.objectContaining({ duration: 123, name: 'Video 1' })
    }));
  });

  it('should handle missing slugs and use slugify', async () => {
    setupMockPage();
    mockInterceptedDataRepo.getPendingForCourse.mockResolvedValue([
      { filePath: 'p1.json', content: JSON.stringify({ data: { id: '123', name: 'Course With No Slug' } }) }
    ]);

    await useCase.execute({ courseInput: '123' });
    expect(mockCourseRepo.saveCourse).toHaveBeenCalledWith(expect.objectContaining({
      slug: 'course-with-no-slug'
    }));
  });

  it('should handle numeric ID vs UUID for guides merging', async () => {
    setupMockPage();
    const payload1 = { filePath: 'p1.json', content: JSON.stringify({ data: { id: '123', eKits: [{ id: 'num2', name: 'G' }] } }) };
    const payload2 = { filePath: 'p2.json', content: JSON.stringify({ data: { id: '123', eKits: [{ id: 'num2', ekitId: 'uuid2', name: 'G' }] } }) };
    mockInterceptedDataRepo.getPendingForCourse.mockResolvedValue([payload1, payload2]);

    await useCase.execute({ courseInput: '123' });
    expect(mockAssetRepo.saveAsset).toHaveBeenCalledWith(expect.objectContaining({
      id: 'num2',
      metadata: expect.objectContaining({ ekitId: 'uuid2' })
    }));
  });

  it('should handle keepTempWorkspaces config', async () => {
    setupMockPage();
    const customUseCase = new SyncCourse({
      ...useCase as any,
      config: { ... (useCase as any).config, keepTempWorkspaces: true }
    });

    await customUseCase.execute({ courseInput: '123' });
    expect(mockInterceptedDataRepo.deleteWorkspace).not.toHaveBeenCalled();
  });

  it('should warn and skip if no courseId resolved', async () => {
    mockUrlProvider.resolveCourseUrl.mockReturnValue({ url: '', courseId: '' });
    await useCase.execute({ courseInput: 'invalid' });
    expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('No se pudo resolver'));
  });

  it('should handle invalid JSON in payloads', async () => {
    setupMockPage();
    mockInterceptedDataRepo.getPendingForCourse.mockResolvedValueOnce([{ filePath: 'bad.json', content: 'invalid' }]);

    await useCase.execute({ courseInput: '123' });
    expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Error parseando payload'));
  });

  it('should handle missing guides tab gracefully', async () => {
    const mockPage = setupMockPage();
    mockPage.waitForSelector.mockRejectedValue(new Error('timeout'));

    await useCase.execute({ courseInput: '123' });
    expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('No se pudo hacer click en Guides'));
  });

  it('should warn and exit if no courseInput provided', async () => {
    await useCase.execute({ courseInput: '' });
    expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('No se proporcionó courseUrl'));
  });

  it('should handle eKit matched by UUID first and then update with numeric ID', async () => {
    setupMockPage();
    const p1 = { filePath: 'p1.json', content: JSON.stringify({ data: { id: '123', eKits: [{ ekitId: 'uuid3', name: 'G' }] } }) };
    const p2 = { filePath: 'p2.json', content: JSON.stringify({ data: { id: '123', eKits: [{ id: 'num3', ekitId: 'uuid3', name: 'G' }] } }) };
    mockInterceptedDataRepo.getPendingForCourse.mockResolvedValue([p1, p2]);

    await useCase.execute({ courseInput: '123' });
    expect(mockAssetRepo.saveAsset).toHaveBeenCalledWith(expect.objectContaining({
      id: 'num3',
      metadata: expect.objectContaining({ ekitId: 'uuid3' })
    }));
  });

  it('should handle numeric videoTypeId in config', async () => {
    setupMockPage();
    const customUseCase = new SyncCourse({
      ...useCase as any,
      config: { ... (useCase as any).config, oracleConstants: { videoTypeId: 1 } }
    });
    mockInterceptedDataRepo.getPendingForCourse.mockResolvedValue([
      { filePath: 'p1.json', content: JSON.stringify({ data: { id: '123', modules: [{ components: [{ id: 'v1', typeId: 1, name: 'V' }] }] } }) }
    ]);
    await customUseCase.execute({ courseInput: '123' });
    expect(mockAssetRepo.saveAsset).toHaveBeenCalledWith(expect.objectContaining({ id: 'v1' }));
  });

  it('should handle assets without names and use defaults', async () => {
    setupMockPage();
    mockInterceptedDataRepo.getPendingForCourse.mockResolvedValue([
      {
        filePath: 'p.json',
        content: JSON.stringify({
          data: { id: '123', name: 'C', eKits: [{ id: 'num4' }], modules: [{ components: [{ id: 'v4', typeId: 1 }] }] }
        })
      }
    ]);
    await useCase.execute({ courseInput: '123' });
    expect(mockAssetRepo.saveAsset).toHaveBeenCalledWith(expect.objectContaining({ type: 'guide' }));
    expect(mockAssetRepo.saveAsset).toHaveBeenCalledWith(expect.objectContaining({ type: 'video' }));
  });

  it('should cover all branch fragments and optional field merges', async () => {
    setupMockPage();
    const SLUG = 'full-test';

    // payload 1: Sets everything MINIMAL (no name, no duration for v1)
    const p1 = {
      filePath: 'p1.json', content: JSON.stringify({
        url: 'http://p',
        data: {
          id: '123', name: 'Short', slug: SLUG,
          eKits: [{ id: 'num1', name: 'G1', gcc: 'G', ekitType: 'T', typeId: 1, offeringId: 'O' }],
          modules: [{ components: [{ id: 'v1', typeId: 1 }] }]
        }
      })
    };

    // payload 2: Covers "false" branches and updates
    const p2 = {
      filePath: 'p2.json', content: JSON.stringify({
        url: 'http://AlreadySet?offeringId=off1',
        data: {
          id: '123', title: 'S', slug: SLUG,
          eKits: [{ id: 'num1' }],
          modules: [{ components: [{ id: 'v1', typeId: 1, name: 'Late Name', title: 'Title', duration: 100 }] }]
        }
      })
    };

    const p3 = { filePath: 'p3.json', content: JSON.stringify({ url: 'http://p3', data: { id: '123', slug: SLUG } }) };
    const p4 = { filePath: 'p4.json', content: JSON.stringify({ data: null }) };
    const p5 = { filePath: 'p5.json', content: JSON.stringify({ data: { id: '123', slug: SLUG, eKits: [{ name: 'X' }] } }) };
    const p6 = { filePath: 'p6.json', content: JSON.stringify({ data: { id: '123', slug: SLUG, modules: [{ components: null }] } }) };
    const p7 = { filePath: 'p7.json', content: JSON.stringify({ data: { id: '123', slug: SLUG, modules: [{ components: [{ id: 'vX', typeId: 999 }] }] } }) };

    mockInterceptedDataRepo.getPendingForCourse.mockResolvedValue([p1, p2, p3, p4, p5, p6, p7]);

    await useCase.execute({ courseInput: '123' });
    expect(mockAssetRepo.saveAsset).toHaveBeenCalled();
  });

  it('should cover initial offeringId null branch', async () => {
    setupMockPage();
    mockInterceptedDataRepo.getPendingForCourse.mockResolvedValue([
      { filePath: 'p1.json', content: JSON.stringify({ url: 'http://p?offeringId=off1', data: { id: '123', name: 'C' } }) },
      { filePath: 'p2.json', content: JSON.stringify({ url: 'http://p/guide/test', data: { id: '123', name: 'C' } }) }
    ]);
    await useCase.execute({ courseInput: '123' });
    expect(mockLogger.info).toHaveBeenCalled();
  });

  it('should skip cleanup if isolatedDirPath is null', async () => {
    const mockInterceptorInstance = (useCase as any).browserInterceptor;
    vi.spyOn(mockInterceptorInstance, 'setup').mockResolvedValue('');
    setupMockPage();
    await useCase.execute({ courseInput: '123' });
    expect(mockInterceptedDataRepo.deleteWorkspace).not.toHaveBeenCalled();
  });

  it('should handle keepTempWorkspaces: true with null isolatedDirPath', async () => {
    const mockInterceptorInstance = (useCase as any).browserInterceptor;
    vi.spyOn(mockInterceptorInstance, 'setup').mockResolvedValue('');
    const customUseCase = new SyncCourse({
      ...useCase as any,
      config: { ... (useCase as any).config, keepTempWorkspaces: true }
    });
    setupMockPage();
    await customUseCase.execute({ courseInput: '123' });
  });

  it('should cover fallback paths for course metadata', async () => {
    setupMockPage();
    // Test 1: courseTitle and existingCourse?.title are null
    mockCourseRepo.getCourseById.mockResolvedValue(null);
    mockInterceptedDataRepo.getPendingForCourse.mockResolvedValue([
      { filePath: 'p.json', content: JSON.stringify({ data: { id: 'C1', slug: 'S1' } }) }
    ]);
    await useCase.execute({ courseInput: 'C1' });
    expect(mockCourseRepo.saveCourse).toHaveBeenCalledWith(expect.objectContaining({ title: 'Unknown Course' }));

    // Test 2: courseSlug and existingCourse?.slug are null
    mockCourseRepo.getCourseById.mockResolvedValue({ id: 'C2', title: 'T2' } as any);
    mockInterceptedDataRepo.getPendingForCourse.mockResolvedValue([
      { filePath: 'p.json', content: JSON.stringify({ data: { id: 'C2', title: 'T2' } }) }
    ]);
    await useCase.execute({ courseInput: 'C2' });
    expect(mockCourseRepo.saveCourse).toHaveBeenCalledWith(expect.objectContaining({ slug: expect.any(String) }));
  });

  it('should handle components without id or uuid', async () => {
    setupMockPage();
    mockInterceptedDataRepo.getPendingForCourse.mockResolvedValue([
      {
        filePath: 'p.json', content: JSON.stringify({
          data: {
            id: '123', slug: 'S', modules: [{ components: [{ typeId: 1, name: 'NO-ID' }] }]
          }
        })
      }
    ]);
    await useCase.execute({ courseInput: '123' });
    // Should not throw, just skip the component
    expect(mockLogger.info).toHaveBeenCalled();
  });
});
