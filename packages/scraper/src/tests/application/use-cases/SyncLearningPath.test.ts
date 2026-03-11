import { describe, it, expect, vi, beforeEach, Mocked } from 'vitest';

import { AssetNamingService } from '@domain/services/AssetNamingService';
import { IPlatformUrlProvider } from '@domain/services/IPlatformUrlProvider';
import { ILogger } from '@domain/services/ILogger';
import { SyncLearningPath } from '@application/use-cases/SyncLearningPath';
import { IInterceptedDataRepository } from '@domain/repositories/IInterceptedDataRepository';
import { IInterceptedDataRepositoryFactory } from '@domain/repositories/IInterceptedDataRepositoryFactory';

vi.mock('@infrastructure/browser/interceptor', () => ({
    setupInterceptor: vi.fn()
}));

describe('SyncLearningPath Use Case', () => {
    const mockBrowserProvider = {
        getAuthenticatedContext: vi.fn(),
    } as any;

    const mockLearningPathRepo = {
        saveLearningPath: vi.fn(), 
        addCourseToPath: vi.fn(),
        clearPathCourses: vi.fn()
    } as any;

    const mockCourseRepo = {
        saveCourse: vi.fn()
    } as any;

    const mockSyncCourseUseCase = {
        execute: vi.fn()
    } as any;

    const mockInterceptedDataRepo: Mocked<IInterceptedDataRepository> = {
        getPendingLearningPaths: vi.fn(),
        getPendingForLearningPath: vi.fn().mockReturnValue([]),
        deletePayload: vi.fn(),
        getPendingCourses: vi.fn(),
        getPendingForCourse: vi.fn(),
        markAsProcessed: vi.fn(),
        deleteWorkspace: vi.fn(),
    };

    const mockInterceptedDataRepoFactory: Mocked<IInterceptedDataRepositoryFactory> = {
        create: vi.fn().mockReturnValue(mockInterceptedDataRepo)
    };

    const mockUrlProvider: Mocked<IPlatformUrlProvider> = {
        resolveCourseUrl: vi.fn(url => ({ url, courseId: '123' })),
        resolveLearningPathUrl: vi.fn(url => ({ url, pathId: 'lp123' })),
        getCourseUrl: vi.fn(({ slug, id }) => `https://platform.com/course/${slug}/${id}`),
        getVideoAssetUrl: vi.fn().mockReturnValue(''),
        getGuideViewerUrl: vi.fn().mockReturnValue(''),
        getGuideImageBaseUrl: vi.fn(src => src),
    };

    const mockLogger: Mocked<ILogger> = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
        withContext: vi.fn().mockReturnThis()
    };

    let useCase: SyncLearningPath;

    beforeEach(() => {
        vi.clearAllMocks();
        
        useCase = new SyncLearningPath({
            browserProvider: mockBrowserProvider,
            learningPathRepo: mockLearningPathRepo,
            courseRepo: mockCourseRepo,
            syncCourse: mockSyncCourseUseCase,
            interceptedDataRepoFactory: mockInterceptedDataRepoFactory,
            urlProvider: mockUrlProvider,
            namingService: new AssetNamingService(),
            logger: mockLogger
        });
    });

    it('should process pending learning paths and courses', async () => {
        const mockPage = {
            goto: vi.fn(),
            waitForTimeout: vi.fn(),
            close: vi.fn()
        } as any;
        const mockContext = { newPage: vi.fn().mockResolvedValue(mockPage), close: vi.fn() } as any;
        (mockBrowserProvider.getAuthenticatedContext as any).mockResolvedValue(mockContext);

        const mockPayload = {
            filePath: '/tmp/lp.json',
            content: JSON.stringify({
                data: {
                    lpPageData: {
                        id: 'lp123',
                        name: 'My Path',
                        description: 'A test path',
                        containerChildren: [
                            { id: 'c1', name: 'Course 1', typeId: '22' },
                            { id: 'c2', name: 'Course 2', typeId: '22' }
                        ]
                    }
                }
            })
        };
        mockInterceptedDataRepo.getPendingForLearningPath.mockReturnValue([mockPayload]);

        await useCase.execute('http://lp-url');

        expect(mockLearningPathRepo.saveLearningPath).toHaveBeenCalledWith(expect.objectContaining({ 
            id: 'lp123', 
            title: 'My Path' 
        }));
        expect(mockCourseRepo.saveCourse).toHaveBeenCalledTimes(2);
        expect(mockSyncCourseUseCase.execute).toHaveBeenCalledTimes(2);
    });

    it('should skip invalid learning path data', async () => {
        const mockPayload = {
            filePath: 'f1',
            content: JSON.stringify({ data: { lpPageData: { id: '', name: '' } } }) // missing containerChildren
        };
        mockInterceptedDataRepo.getPendingForLearningPath.mockReturnValue([mockPayload]);

        await (useCase as any).processInterceptedData({ pathId: 'lp123', isolatedInterceptedDataRepo: mockInterceptedDataRepo });

        expect(mockLearningPathRepo.saveLearningPath).not.toHaveBeenCalled();
    });

    it('should skip non-course children', async () => {
        const mockPayload = {
            filePath: 'f1',
            content: JSON.stringify({
                data: {
                    lpPageData: {
                        id: 'lp1',
                        name: 'Path',
                        containerChildren: [
                            { id: 'other', name: 'Other', typeId: '99' },
                            { id: 'c1', name: 'Course', typeId: '22' }
                        ]
                    }
                }
            })
        };
        mockInterceptedDataRepo.getPendingForLearningPath.mockReturnValue([mockPayload]);

        await (useCase as any).processInterceptedData({ pathId: 'lp1', isolatedInterceptedDataRepo: mockInterceptedDataRepo });

        expect(mockCourseRepo.saveCourse).toHaveBeenCalledTimes(1);
        expect(mockCourseRepo.saveCourse).toHaveBeenCalledWith(expect.objectContaining({ id: 'c1' }));
    });

    it('should handle learning path without description', async () => {
        const mockPayload = {
            filePath: 'f2',
            content: JSON.stringify({
                data: {
                    lpPageData: {
                        id: 'lp2',
                        name: 'No Desc Path',
                        containerChildren: [] // description missing
                    }
                }
            })
        };
        mockInterceptedDataRepo.getPendingForLearningPath.mockReturnValue([mockPayload]);

        await (useCase as any).processInterceptedData({ pathId: 'lp2', isolatedInterceptedDataRepo: mockInterceptedDataRepo });

        expect(mockLearningPathRepo.saveLearningPath).toHaveBeenCalledWith(expect.objectContaining({ 
            id: 'lp2', 
            description: '' 
        }));
    });

});
