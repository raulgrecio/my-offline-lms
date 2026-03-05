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

    const mockInterceptedDataRepo = {
        getPendingLearningPaths: vi.fn(),
        deletePayload: vi.fn()
    } as any;

    const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
        withContext: vi.fn().mockReturnThis()
    } as any;

    let useCase: SyncLearningPath;

    beforeEach(() => {
        vi.clearAllMocks();
        useCase = new SyncLearningPath({
            browserProvider: mockBrowserProvider,
            learningPathRepo: mockLearningPathRepo,
            courseRepo: mockCourseRepo,
            syncCourseData: mockSyncCourseUseCase,
            interceptedDataRepo: mockInterceptedDataRepo,
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
        mockInterceptedDataRepo.getPendingLearningPaths.mockReturnValue([mockPayload]);

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
        mockInterceptedDataRepo.getPendingLearningPaths.mockReturnValue([mockPayload]);

        await (useCase as any).processInterceptedData();

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
        mockInterceptedDataRepo.getPendingLearningPaths.mockReturnValue([mockPayload]);

        await (useCase as any).processInterceptedData();

        expect(mockCourseRepo.saveCourse).toHaveBeenCalledTimes(1);
        expect(mockCourseRepo.saveCourse).toHaveBeenCalledWith(expect.objectContaining({ id: 'c1' }));
    });
});
