import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SyncCourseData } from '../../../application/use-cases/SyncCourseData';

vi.mock('../../../infrastructure/browser/interceptor', () => ({
    setupInterceptor: vi.fn()
}));

describe('SyncCourseData Use Case', () => {
    const mockBrowserProvider = {
        getAuthenticatedContext: vi.fn(),
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

    let useCase: SyncCourseData;

    beforeEach(() => {
        vi.clearAllMocks();
        mockInterceptedDataRepo.getPendingCourses.mockReturnValue([]);
        useCase = new SyncCourseData(mockBrowserProvider, mockCourseRepo, mockAssetRepo, mockInterceptedDataRepo);
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
                    id: 'course123',
                    name: 'Test Course',
                    modules: [
                        {
                            name: 'Module 1',
                            components: [
                                { id: 'v1', typeId: '1', name: 'Video 1', videoId: 'bc1', duration: '10:00' }
                            ]
                        }
                    ],
                    eKits: [
                        { id: 'k1', name: 'Guide 1', ekitId: 'e1', url: 'http://g1', fileType: 'pdf' }
                    ]
                }
            })
        };
        mockInterceptedDataRepo.getPendingCourses.mockReturnValue([mockPayload]);

        // Fix: Use a URL that contains "/course/" to trigger the tab click logic
        await useCase.execute('https://platform.com/ou/course/test-course/123');

        expect(mockCourseRepo.saveCourse).toHaveBeenCalledWith(expect.objectContaining({ id: 'course123', title: 'Test Course' }));
        expect(mockAssetRepo.saveAsset).toHaveBeenCalledTimes(2);
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

        expect(mockPage.waitForSelector).toHaveBeenCalledWith('#guides-tab', expect.anything());
        expect(mockPage.click).toHaveBeenCalledWith('#guides-tab');
    });
});
