import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SyncLearningPath } from '../../../application/use-cases/SyncLearningPath';

vi.mock('../../../infrastructure/browser/interceptor', () => ({
    setupInterceptor: vi.fn()
}));

describe('SyncLearningPath Use Case', () => {
    const mockBrowserProvider = {
        getAuthenticatedContext: vi.fn(),
    } as any;
    const mockLearningPathRepo = {
        saveLearningPath: vi.fn(), // Corrected from savePath
        addCourseToPath: vi.fn(),
        clearPathCourses: vi.fn()
    } as any;
    const mockCourseRepo = {
        saveCourse: vi.fn()
    } as any;
    const mockSyncCourseUseCase = {
        execute: vi.fn()
    } as any;
    const mockInterceptedDataRepo = {
        getPendingLearningPaths: vi.fn(),
        deletePayload: vi.fn()
    } as any;

    let useCase: SyncLearningPath;

    beforeEach(() => {
        vi.clearAllMocks();
        useCase = new SyncLearningPath({ 
            browserProvider: mockBrowserProvider, 
            learningPathRepo: mockLearningPathRepo, 
            courseRepo: mockCourseRepo, 
            syncCourseData: mockSyncCourseUseCase as any, 
            interceptedDataRepo: mockInterceptedDataRepo 
        });
    });

    it('should process pending learning paths and courses', async () => {
        const mockPage = {
            goto: vi.fn(),
            waitForTimeout: vi.fn(),
            close: vi.fn()
        } as any;
        const mockContext = { newPage: vi.fn().mockResolvedValue(mockPage), close: vi.fn() } as any;
        mockBrowserProvider.getAuthenticatedContext.mockResolvedValue(mockContext);

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
        mockInterceptedDataRepo.getPendingLearningPaths.mockReturnValue([mockPayload]);

        await useCase.execute('http://lp-url');

        expect(mockLearningPathRepo.saveLearningPath).toHaveBeenCalledWith(expect.objectContaining({ 
            id: 'lp123', 
            title: 'My Path' 
        }));
        expect(mockCourseRepo.saveCourse).toHaveBeenCalledTimes(2);
        expect(mockSyncCourseUseCase.execute).toHaveBeenCalledTimes(2);
    });
});
