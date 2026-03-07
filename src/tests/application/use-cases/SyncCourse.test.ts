import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SyncCourse } from '../../../application/use-cases/SyncCourse';
import { AssetNamingService } from '../../../domain/services/AssetNamingService';
import { PLATFORM } from '../../../config/platform';

vi.mock('../../../infrastructure/browser/interceptor', () => ({
    setupInterceptor: vi.fn()
}));

describe('SyncCourse Use Case', () => {
    const mockBrowserProvider = {
        getAuthenticatedContext: vi.fn(),
        close: vi.fn(),
    } as any;
    
    const mockCourseRepo = {
        saveCourse: vi.fn()
    } as any;
    
    const mockAssetRepo = {
        saveAsset: vi.fn(),
        getCourseAssets: vi.fn().mockReturnValue([])
    } as any;
    
    const mockInterceptedDataRepo = {
        getPendingCourses: vi.fn().mockReturnValue([]),
        deletePayload: vi.fn()
    } as any;

    const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
        withContext: vi.fn().mockReturnThis(),
    } as any;

    const mockUrlProvider = {
        resolveCourseUrl: vi.fn(url => {
            const resolved = url.startsWith('http') ? url : `https://platform.com/ou/course/path/${url}`;
            return resolved.endsWith('/') ? resolved : `${resolved}/`;
        }),
        getCourseUrl: vi.fn(({ slug, id }) => `https://platform.com/ou/course/${slug}/${id}`),
        getVideoAssetUrl: vi.fn(({courseUrl, assetId}) => {
            const base = courseUrl.endsWith('/') ? courseUrl : `${courseUrl}/`;
            return `${base}${assetId}`;
        }),
        getGuideViewerUrl: vi.fn(({courseId, offeringId, ekitId}) => `https://platform.com/ekit/${courseId}/${offeringId}/${ekitId}/course`)
    } as any;

    let useCase: SyncCourse;

    beforeEach(() => {
        vi.clearAllMocks();
        mockInterceptedDataRepo.getPendingCourses.mockReturnValue([]);
        useCase = new SyncCourse({
            browserProvider: mockBrowserProvider,
            courseRepository: mockCourseRepo,
            assetRepository: mockAssetRepo,
            interceptedDataRepo: mockInterceptedDataRepo,
            urlProvider: mockUrlProvider,
            namingService: new AssetNamingService(),
            logger: mockLogger,
        });
    });

    it('should warn and exit if no coursePath provided', async () => {
        await useCase.execute('');
        expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('No se proporcionó coursePath'));
        expect(mockBrowserProvider.getAuthenticatedContext).not.toHaveBeenCalled();
    });

    it('should resolve slug to full URL', async () => {
        const mockPage = {
            goto: vi.fn().mockResolvedValue(undefined),
            close: vi.fn().mockResolvedValue(undefined),
        } as any;
        const mockContext = { newPage: vi.fn().mockResolvedValue(mockPage), close: vi.fn() } as any;
        mockBrowserProvider.getAuthenticatedContext.mockResolvedValue(mockContext);

        await useCase.execute('my-course-slug');
        
        expect(mockPage.goto).toHaveBeenCalledWith(expect.stringContaining('/ou/course/path/my-course-slug'), expect.anything());
    });

    it('should skip if context creation fails', async () => {
        mockBrowserProvider.getAuthenticatedContext.mockResolvedValue(null);
        await expect(useCase.execute('http://course-url')).rejects.toThrow();
    });

    it('should process pending courses from intercepted data', async () => {
        const mockPage = {
            goto: vi.fn().mockResolvedValue(undefined),
            waitForTimeout: vi.fn().mockResolvedValue(undefined),
            close: vi.fn().mockResolvedValue(undefined),
            $: vi.fn().mockResolvedValue({ click: vi.fn() }),
            waitForSelector: vi.fn().mockResolvedValue({})
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
        mockInterceptedDataRepo.getPendingCourses.mockReturnValue([mockPayload]);

        await useCase.execute('https://platform.com/ou/course/test-course/123');

        expect(mockCourseRepo.saveCourse).toHaveBeenCalledWith(expect.objectContaining({ id: '123', title: 'Test Course' }));
        expect(mockAssetRepo.saveAsset).toHaveBeenCalledWith(expect.objectContaining({ 
            id: 'v1', 
            type: 'video', 
            url: 'https://platform.com/ou/course/test-course/123/v1' 
        }));
        expect(mockAssetRepo.saveAsset).toHaveBeenCalledTimes(2);
    });

    it('should handle course data with missing modules or eKits', async () => {
        const mockPage = {
            goto: vi.fn(),
            close: vi.fn(),
            waitForSelector: vi.fn().mockResolvedValue({}),
            click: vi.fn()
        } as any;
        const mockContext = { newPage: vi.fn().mockResolvedValue(mockPage), close: vi.fn() } as any;
        mockBrowserProvider.getAuthenticatedContext.mockResolvedValue(mockContext);

        const mockPayload = {
            filePath: 'f1',
            content: JSON.stringify({
                data: { id: '123', name: 'Simple Course' } // No modules, no eKits
            })
        };
        mockInterceptedDataRepo.getPendingCourses.mockReturnValue([mockPayload]);

        await useCase.execute('https://platform.com/ou/course/simple-course/123');

        expect(mockCourseRepo.saveCourse).toHaveBeenCalled();
        expect(mockAssetRepo.saveAsset).not.toHaveBeenCalled();
    });

    it('should filter non-video components', async () => {
        const mockPage = {
            goto: vi.fn(),
            close: vi.fn(),
            waitForSelector: vi.fn().mockResolvedValue({}),
            click: vi.fn()
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
        mockInterceptedDataRepo.getPendingCourses.mockReturnValue([mockPayload]);

        await useCase.execute('https://platform.com/ou/course/mixed/123');

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

        mockInterceptedDataRepo.getPendingCourses.mockReturnValue([
            { filePath: 'f1', content: JSON.stringify({ data: { id: 'other', name: 'other' } }) }
        ]);

        await useCase.execute('https://platform.com/ou/course/target-course/123');

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

        await useCase.execute('https://platform.com/ou/course/test-course/123');

        expect(mockPage.waitForSelector).toHaveBeenCalledWith(PLATFORM.SELECTORS.COURSE.GUIDES_TAB, expect.anything());
        expect(mockPage.click).toHaveBeenCalledWith(PLATFORM.SELECTORS.COURSE.GUIDES_TAB);
    });
});
