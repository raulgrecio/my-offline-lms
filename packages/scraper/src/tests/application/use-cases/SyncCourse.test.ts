import { describe, it, expect, vi, beforeEach, Mocked } from 'vitest';

import { AssetNamingService } from '@domain/services/AssetNamingService';
import { PLATFORM } from '@config/platform';
import { IPlatformUrlProvider } from '@domain/services/IPlatformUrlProvider';
import { ILogger } from '@domain/services/ILogger';
import { SyncCourse } from '@application/use-cases/SyncCourse';
import { IInterceptedDataRepository } from '@domain/repositories/IInterceptedDataRepository';
import { IInterceptedDataRepositoryFactory } from '@domain/repositories/IInterceptedDataRepositoryFactory';

vi.mock('@infrastructure/browser/interceptor', () => ({
    setupInterceptor: vi.fn(),
}));

describe('SyncCourse Use Case', () => {
    const mockBrowserProvider = {
        getAuthenticatedContext: vi.fn(),
        close: vi.fn(),
    } as any;
    
    const mockCourseRepo = {
        saveCourse: vi.fn(),
    } as any;
    
    const mockAssetRepo = {
        saveAsset: vi.fn(),
        getCourseAssets: vi.fn().mockReturnValue([]),
    } as any;
    
    const mockInterceptedDataRepo: Mocked<IInterceptedDataRepository> = {
        getPendingForCourse: vi.fn().mockReturnValue([]),
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
        resolveCourseUrl: vi.fn(url => ({ url, courseId: '123' })),
        resolveLearningPathUrl: vi.fn(url => ({ url, pathId: '123' })),
        getCourseUrl: vi.fn(({ slug, id }) => `https://platform.com/ou/course/${slug}/${id}`),
        getVideoAssetUrl: vi.fn(({courseUrl, assetId}) => {
            const base = courseUrl.endsWith('/') ? courseUrl : `${courseUrl}/`;
            return `${base}${assetId}`;
        }),
        getGuideViewerUrl: vi.fn(({courseId, offeringId, ekitId}) => `https://platform.com/ekit/${courseId}/${offeringId}/${ekitId}/course`),
        getGuideImageBaseUrl: vi.fn(src => src),
    };

    let useCase: SyncCourse;

    beforeEach(() => {
        vi.clearAllMocks();
        mockInterceptedDataRepo.getPendingForCourse.mockReturnValue([]);

        useCase = new SyncCourse({
            browserProvider: mockBrowserProvider,
            courseRepository: mockCourseRepo,
            assetRepository: mockAssetRepo,
            interceptedDataRepoFactory: mockInterceptedDataRepoFactory,
            urlProvider: mockUrlProvider,
            namingService: new AssetNamingService(),
            logger: mockLogger,
        });
    });

    it('should warn and exit if no courseInput provided', async () => {
        await useCase.execute({courseInput: ''});
        expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('No se proporcionó courseUrl'));
        expect(mockBrowserProvider.getAuthenticatedContext).not.toHaveBeenCalled();
    });

    it('should use base course URL from real platform provider', async () => {
        const mockPage = {
            goto: vi.fn().mockResolvedValue(undefined),
            close: vi.fn(),
        } as any;
        const mockContext = { newPage: vi.fn().mockResolvedValue(mockPage), close: vi.fn() } as any;
        mockBrowserProvider.getAuthenticatedContext.mockResolvedValue(mockContext);

        await useCase.execute({courseInput: '150265'});
        expect(mockPage.goto).toHaveBeenCalledWith(expect.stringContaining('150265'), expect.anything());
    });

    it('should skip if context creation fails', async () => {
        mockBrowserProvider.getAuthenticatedContext.mockResolvedValue(null);
        await expect(useCase.execute({courseInput: 'http://course-url'})).rejects.toThrow();
    });

    it('should process pending courses from intercepted data', async () => {
        const mockPage = {
            goto: vi.fn().mockResolvedValue(undefined),
            waitForTimeout: vi.fn().mockResolvedValue(undefined),
            close: vi.fn().mockResolvedValue(undefined),
            $: vi.fn().mockResolvedValue({ click: vi.fn() }),
            waitForSelector: vi.fn().mockResolvedValue({}),
        } as any;
        const mockContext = { newPage: vi.fn().mockResolvedValue(mockPage), close: vi.fn() } as any;
        mockBrowserProvider.getAuthenticatedContext.mockResolvedValue(mockContext);

        const mockPayload = {
            filePath: '/tmp/course.json',
            content: JSON.stringify({
                data: {
                    id: '123',
                    name: 'Test Course',
                    modules: [
                        {
                            id: 'm1',
                            components: [
                                { id: 'v1', typeId: '1', name: 'Video 1', duration: 100 }
                            ]
                        }
                    ],
                    eKits: [
                        { ekitId: 'g1', name: 'Guide 1' }
                    ]
                }
            })
        };
        mockInterceptedDataRepo.getPendingForCourse.mockReturnValue([mockPayload]);

        await useCase.execute({courseInput: 'https://platform.com/ou/course/test-course/123'});

        expect(mockCourseRepo.saveCourse).toHaveBeenCalledWith(expect.objectContaining({ id: '123', title: 'Test Course' }));
        expect(mockAssetRepo.saveAsset).toHaveBeenCalledWith(expect.objectContaining({ 
            id: 'v1', 
            type: 'video', 
            url: 'https://platform.com/ou/course/test-course/123/v1',
            metadata: expect.objectContaining({
                name: 'Video 1',
                duration: 100
            })
        }));
        expect(mockAssetRepo.saveAsset).toHaveBeenCalledTimes(2);
    });

    it('should handle course data with missing modules or eKits', async () => {
        const mockPage = {
            goto: vi.fn(),
            close: vi.fn(),
            waitForSelector: vi.fn().mockResolvedValue({}),
            click: vi.fn(),
        } as any;
        const mockContext = { newPage: vi.fn().mockResolvedValue(mockPage), close: vi.fn() } as any;
        mockBrowserProvider.getAuthenticatedContext.mockResolvedValue(mockContext);

        const mockPayload = {
            filePath: 'f1',
            content: JSON.stringify({
                data: { id: '123', name: 'Simple Course' } // No modules, no eKits
            })
        };
        mockInterceptedDataRepo.getPendingForCourse.mockReturnValue([mockPayload]);

        await useCase.execute({courseInput: 'https://platform.com/ou/course/simple-course/123'});

        expect(mockCourseRepo.saveCourse).toHaveBeenCalled();
        expect(mockAssetRepo.saveAsset).not.toHaveBeenCalled();
    });

    it('should filter non-video components', async () => {
        const mockPage = {
            goto: vi.fn(),
            close: vi.fn(),
            waitForSelector: vi.fn().mockResolvedValue({}),
            click: vi.fn(),
        } as any;
        const mockContext = { newPage: vi.fn().mockResolvedValue(mockPage), close: vi.fn() } as any;
        mockBrowserProvider.getAuthenticatedContext.mockResolvedValue(mockContext);

        const mockPayload = {
            filePath: 'f2',
            content: JSON.stringify({
                data: {
                    id: '123',
                    name: 'Mixed Components',
                    modules: [{
                        id: 'm1',
                        components: [
                            { id: 'v1', typeId: '1', name: 'Video' },
                            { id: 'o1', typeId: '99', name: 'Other' }
                        ]
                    }]
                }
            })
        };
        mockInterceptedDataRepo.getPendingForCourse.mockReturnValue([mockPayload]);

        await useCase.execute({courseInput: 'https://platform.com/ou/course/mixed/123'});

        expect(mockAssetRepo.saveAsset).toHaveBeenCalledTimes(1);
        expect(mockAssetRepo.saveAsset).toHaveBeenCalledWith(expect.objectContaining({ id: 'v1' }));
    });

    it('should warn if no intercepted data matches', async () => {
        const mockPage = {
            goto: vi.fn().mockResolvedValue(undefined),
            close: vi.fn().mockResolvedValue(undefined),
        } as any;
        const mockContext = { newPage: vi.fn().mockResolvedValue(mockPage), close: vi.fn() } as any;
        mockBrowserProvider.getAuthenticatedContext.mockResolvedValue(mockContext);

        mockInterceptedDataRepo.getPendingForCourse.mockReturnValue([
            { filePath: 'f1', content: JSON.stringify({ data: { id: 'other', name: 'other' } }) }
        ]);

        await useCase.execute({courseInput: 'https://platform.com/ou/course/target-course/123'});

        expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('No se encontraron datos'));
    });

    it('should handle guides tab click if present', async () => {
        const mockPage = {
            goto: vi.fn().mockResolvedValue(undefined),
            waitForTimeout: vi.fn().mockResolvedValue(undefined),
            close: vi.fn().mockResolvedValue(undefined),
            $: vi.fn().mockResolvedValue({ click: vi.fn() }),
            waitForSelector: vi.fn().mockResolvedValue({}),
            click: vi.fn().mockResolvedValue(undefined)
        } as any;
        const mockContext = { newPage: vi.fn().mockResolvedValue(mockPage), close: vi.fn() } as any;
        mockBrowserProvider.getAuthenticatedContext.mockResolvedValue(mockContext);

        await useCase.execute({courseInput: 'https://platform.com/ou/course/test-course/123'});

        expect(mockPage.waitForSelector).toHaveBeenCalledWith(PLATFORM.SELECTORS.COURSE.GUIDES_TAB, expect.anything());
        expect(mockPage.click).toHaveBeenCalledWith(PLATFORM.SELECTORS.COURSE.GUIDES_TAB);
    });

    it('should merge metadata from multiple intercepted payloads for the same course', async () => {
        const mockPage = {
            goto: vi.fn().mockResolvedValue(undefined),
            waitForTimeout: vi.fn().mockResolvedValue(undefined),
            close: vi.fn().mockResolvedValue(undefined),
            waitForSelector: vi.fn().mockResolvedValue({}),
            click: vi.fn().mockResolvedValue(undefined),
        } as any;
        const mockContext = { newPage: vi.fn().mockResolvedValue(mockPage), close: vi.fn() } as any;
        mockBrowserProvider.getAuthenticatedContext.mockResolvedValue(mockContext);

        const payload1 = {
            filePath: 'p1.json',
            content: JSON.stringify({
                url: 'https://platform.com/api/v1/course/123?offeringId=12345',
                data: {
                    id: '123',
                    name: 'Test Course',
                    eKits: [
                        { id: '244297', ekitId: 'uuid-sg', name: 'Student Guide' }
                    ]
                }
            })
        };

        const payload2 = {
            filePath: 'p2.json',
            content: JSON.stringify({
                data: {
                    id: '123',
                    eKits: [
                        { id: '244297', gcc: 'D1111043GC10', ekitType: '1' }
                    ]
                }
            })
        };

        mockInterceptedDataRepo.getPendingForCourse.mockReturnValue([payload1, payload2]);

        await useCase.execute({courseInput: 'https://platform.com/ou/course/test/123'});

        // Verify saveAsset was called with merged data
        // assetId should be the numeric id '244297'
        expect(mockAssetRepo.saveAsset).toHaveBeenCalledWith(expect.objectContaining({
            id: '244297',
            metadata: expect.objectContaining({
                id: '244297',
                ekitId: 'uuid-sg',
                name: 'Student Guide',
                gcc: 'D1111043GC10',
                ekitType: '1',
                offeringId: '12345',
            })
        }));

        // Verify both payloads were marked as processed (renamed)
        expect(mockInterceptedDataRepo.markAsProcessed).toHaveBeenCalledWith('p1.json');
        expect(mockInterceptedDataRepo.markAsProcessed).toHaveBeenCalledWith('p2.json');
    });
});
