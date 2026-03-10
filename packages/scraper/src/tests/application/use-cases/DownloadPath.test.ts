import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DownloadPath } from '@application/use-cases/DownloadPath';
import { AssetNamingService } from '@domain/services/AssetNamingService';
import { ILogger } from '@domain/services/ILogger';

describe('DownloadPath Use Case', () => {
    const mockLearningPathRepo = {
        getCoursesForPath: vi.fn()
    } as any;

    const mockSyncLearningPath = {
        execute: vi.fn()
    } as any;

    const mockDownloadGuides = {
        executeForCourse: vi.fn()
    } as any;

    const mockDownloadVideos = {
        executeForCourse: vi.fn()
    } as any;

    const mockLogger: ILogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
        withContext: vi.fn().mockReturnThis()
    };

    let useCase: DownloadPath;

    beforeEach(() => {
        vi.clearAllMocks();
        useCase = new DownloadPath({
            learningPathRepo: mockLearningPathRepo,
            syncLearningPath: mockSyncLearningPath,
            downloadGuides: mockDownloadGuides,
            downloadVideos: mockDownloadVideos,
            namingService: new AssetNamingService(),
            logger: mockLogger,
        });
    });

    it('should warn and exit if no courses found for path', async () => {
        mockLearningPathRepo.getCoursesForPath.mockReturnValue([]);
        
        await useCase.execute({pathInput: 'path123', type: 'all'});
        
        expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('No se encontraron cursos'));
        expect(mockDownloadGuides.executeForCourse).not.toHaveBeenCalled();
        expect(mockDownloadVideos.executeForCourse).not.toHaveBeenCalled();
    });

    it('should call both guides and videos when type is all', async () => {
        const mockCourses = [
            { id: 'course1', title: 'Course 1', orderIndex: 1 },
            { id: 'course2', title: 'Course 2', orderIndex: 2 }
        ];
        mockLearningPathRepo.getCoursesForPath.mockReturnValue(mockCourses);
        
        await useCase.execute({pathInput: 'path123', type: 'all'});
        
        expect(mockDownloadGuides.executeForCourse).toHaveBeenCalledTimes(2);
        expect(mockDownloadVideos.executeForCourse).toHaveBeenCalledTimes(2);
        expect(mockDownloadGuides.executeForCourse).toHaveBeenCalledWith('course1');
        expect(mockDownloadVideos.executeForCourse).toHaveBeenCalledWith('course1');
        expect(mockDownloadGuides.executeForCourse).toHaveBeenCalledWith('course2');
        expect(mockDownloadVideos.executeForCourse).toHaveBeenCalledWith('course2');
    });

    it('should only call guides download when type is guide', async () => {
        mockLearningPathRepo.getCoursesForPath.mockReturnValue([{ id: 'c1', title: 'T1', orderIndex: 1 }]);
        
        await useCase.execute({pathInput: 'p1', type: 'guide'});
        
        expect(mockDownloadGuides.executeForCourse).toHaveBeenCalledWith('c1');
        expect(mockDownloadVideos.executeForCourse).not.toHaveBeenCalled();
    });

    it('should only call videos download when type is video', async () => {
        mockLearningPathRepo.getCoursesForPath.mockReturnValue([{ id: 'c1', title: 'T1', orderIndex: 1 }]);
        
        await useCase.execute({pathInput: 'p1', type: 'video'});
        
        expect(mockDownloadVideos.executeForCourse).toHaveBeenCalledWith('c1');
        expect(mockDownloadGuides.executeForCourse).not.toHaveBeenCalled();
    });
});
