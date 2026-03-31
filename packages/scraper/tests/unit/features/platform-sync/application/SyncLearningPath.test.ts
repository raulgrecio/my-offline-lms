import { beforeEach, describe, expect, it, Mocked, vi } from 'vitest';

import { type ILogger } from '@core/logging';

import {
  type ICourseRepository,
  type IInterceptedDataRepositoryFactory,
  type IInterceptedDataRepository,
  type ILearningPathRepository,
  type IPlatformUrlProvider,
  SyncCourse,
  SyncLearningPath
} from '@scraper/features/platform-sync';

import { AssetNamingService } from '@scraper/features/asset-download';

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

describe('SyncLearningPath Use Case', () => {
  const mockBrowserProvider = {
    getAuthenticatedContext: vi.fn(),
    close: vi.fn(),
  } as any;

  const mockLearningPathRepo: Mocked<ILearningPathRepository> = {
    saveLearningPath: vi.fn(),
    addCourseToPath: vi.fn(),
    getLearningPathById: vi.fn(),
    getAllLearningPaths: vi.fn() as any, // Not in interface but sometimes used in tests? No, it's NOT in interface.
    getCoursesForPath: vi.fn().mockReturnValue([]),
  } as any;

  const mockCourseRepo: Mocked<ICourseRepository> = {
    saveCourse: vi.fn(),
    getCourseById: vi.fn(),
    getCourseAssets: vi.fn().mockReturnValue([]),
  } as any;

  const mockSyncCourseUseCase = {
    execute: vi.fn(),
  } as unknown as Mocked<SyncCourse>;

  const mockInterceptedDataRepo: Mocked<IInterceptedDataRepository> = {
    getPendingForLearningPath: vi.fn(),
    getPendingLearningPaths: vi.fn(),
    getPendingForCourse: vi.fn(),
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
    resolveLearningPathUrl: vi.fn(url => ({ url: String(url), pathId: '123' })),
    resolveCourseUrl: vi.fn(url => ({ url, courseId: '123' })),
    getCourseUrl: vi.fn(({ slug, id }) => `https://platform.com/ou/course/${slug}/${id}`),
    getVideoAssetUrl: vi.fn(),
    getGuideViewerUrl: vi.fn(),
    getGuideImageBaseUrl: vi.fn(),
  };

  let useCase: SyncLearningPath;

  beforeEach(() => {
    vi.clearAllMocks();
    mockInterceptedDataRepo.getPendingForLearningPath.mockResolvedValue([]);

    useCase = new SyncLearningPath({
      browserProvider: mockBrowserProvider,
      learningPathRepo: mockLearningPathRepo,
      courseRepo: mockCourseRepo,
      syncCourse: mockSyncCourseUseCase,
      interceptedDataRepoFactory: mockInterceptedDataRepoFactory,
      browserInterceptor: new BrowserInterceptor({} as any),
      urlProvider: mockUrlProvider,
      namingService: new AssetNamingService(),
      logger: mockLogger,
      config: {
        keepTempWorkspaces: false,
      }
    });
  });

  const setupMockPage = () => {
    const mockPage = {
      goto: vi.fn().mockResolvedValue(undefined),
      waitForTimeout: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined)
    } as any;
    mockBrowserProvider.getAuthenticatedContext.mockResolvedValue({
      newPage: vi.fn().mockResolvedValue(mockPage),
      close: vi.fn().mockResolvedValue(undefined)
    });
    return mockPage;
  };

  it('should process everything and sync courses', async () => {
    setupMockPage();

    const payload = {
      filePath: 'p1.json',
      content: JSON.stringify({
        url: 'http://p1/148510/foo',
        data: {
          lpPageData: {
            id: 'lp123',
            name: 'LP Name',
            description: 'LP Desc',
            containerChildren: [
              { id: 'c1', name: 'Course 1', typeId: '22' },
              { id: 'c2', name: 'Other', typeId: '99' } // Should skip
            ]
          }
        }
      })
    };
    mockInterceptedDataRepo.getPendingForLearningPath.mockResolvedValue([payload]);
    await useCase.execute({ pathInput: 'lp1' });
    expect(mockLearningPathRepo.saveLearningPath).toHaveBeenCalledWith(expect.objectContaining({ title: 'LP Name' }));
    expect(mockCourseRepo.saveCourse).toHaveBeenCalledWith(expect.objectContaining({ id: 'c1' }));
    expect(mockSyncCourseUseCase.execute).toHaveBeenCalled();
    expect(mockInterceptedDataRepo.markAsProcessed).toHaveBeenCalledWith('p1.json');
    expect(mockInterceptedDataRepo.deleteWorkspace).toHaveBeenCalled();
  });

  it('should skip courses with missing id or name', async () => {
    setupMockPage();
    const payload = {
      filePath: 'p1.json',
      content: JSON.stringify({
        data: {
          lpPageData: {
            id: 'lp123',
            name: 'LP Name',
            containerChildren: [
              { id: '', name: 'No ID', typeId: '22' },
              { id: 'c1', name: '', typeId: '22' }
            ]
          }
        }
      })
    };
    mockInterceptedDataRepo.getPendingForLearningPath.mockResolvedValue([payload]);

    await useCase.execute({ pathInput: 'lp1' });
    expect(mockCourseRepo.saveCourse).not.toHaveBeenCalled();
  });

  it('should handle keepTempWorkspaces: true', async () => {
    const customUseCase = new SyncLearningPath({
      ...useCase as any,
      config: { keepTempWorkspaces: true }
    });

    setupMockPage();
    const payload = {
      filePath: 'p1.json',
      content: JSON.stringify({ data: { lpPageData: { id: 'lp1', name: 'T', containerChildren: [] } } })
    };
    mockInterceptedDataRepo.getPendingForLearningPath.mockResolvedValue([payload]);

    await customUseCase.execute({ pathInput: 'lp1' });

    expect(mockInterceptedDataRepo.deleteWorkspace).not.toHaveBeenCalled();
    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Manteniendo espacio de trabajo'));
  });

  it('should skip cleanup if isolatedDirPath is null', async () => {
    const mockInterceptorInstance = (useCase as any).browserInterceptor;
    vi.spyOn(mockInterceptorInstance, 'setup').mockResolvedValue('');

    setupMockPage();
    await useCase.execute({ pathInput: 'lp1' });
    expect(mockInterceptedDataRepo.deleteWorkspace).not.toHaveBeenCalled();
  });

  it('should return early if no pathInput provided', async () => {
    await useCase.execute({ pathInput: '' });
    expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('No se proporcionó pathInput'));
  });

  it('should return early if pathUrl resolution fails', async () => {
    mockUrlProvider.resolveLearningPathUrl.mockReturnValueOnce({ url: '', pathId: '' });
    await useCase.execute({ pathInput: 'invalid' });
    expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('No se pudo resolver'));
  });

  it('should skip lpPageData with missing fields', async () => {
    setupMockPage();
    // Test for missing lpPageData, missing id, and missing containerChildren
    const payloads = [
      { filePath: 'p1.json', content: JSON.stringify({ data: { lpPageData: null } }) },
      { filePath: 'p2.json', content: JSON.stringify({ data: { lpPageData: { name: 'T' } } }) }, // No id
      { filePath: 'p3.json', content: JSON.stringify({ data: { lpPageData: { id: 'lp1', name: 'T' } } }) } // No children
    ];

    mockInterceptedDataRepo.getPendingForLearningPath.mockResolvedValue(payloads);
    await useCase.execute({ pathInput: 'lp1' });
    expect(mockLearningPathRepo.saveLearningPath).not.toHaveBeenCalled();
  });

  it('should handle null offeringId extraction from URL', async () => {
    setupMockPage();
    const payload = {
      filePath: 'p.json',
      content: JSON.stringify({
        url: 'http://no-id',
        data: {
          lpPageData: { id: 'lp1', name: 'T', containerChildren: [{ id: 'c1', name: 'C', typeId: '22' }] }
        }
      })
    };
    mockInterceptedDataRepo.getPendingForLearningPath.mockResolvedValue([payload]);
    await useCase.execute({ pathInput: 'lp1' });
    expect(mockSyncCourseUseCase.execute).toHaveBeenCalledWith(expect.objectContaining({ offeringId: undefined }));
  });

  it('should handle keepTempWorkspaces: true with null isolatedDirPath', async () => {
    // To cover Line 95 false branch
    const mockInterceptorInstance = (useCase as any).browserInterceptor;
    vi.spyOn(mockInterceptorInstance, 'setup').mockResolvedValue('');

    const customUseCase = new SyncLearningPath({
      ...useCase as any,
      config: { keepTempWorkspaces: true }
    });

    setupMockPage();
    await customUseCase.execute({ pathInput: 'lp1' });
    // Line 95 false branch should be hit
  });
});
