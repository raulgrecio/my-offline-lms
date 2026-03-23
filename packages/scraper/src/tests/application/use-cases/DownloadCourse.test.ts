import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DownloadCourse } from '@features/asset-download/application/DownloadCourse';
import { AssetNamingService } from '@features/asset-download/infrastructure/AssetNamingService';
import { ILogger } from '@my-offline-lms/core/logging';

describe('DownloadCourse Use Case', () => {
    const mockCourseRepo = {
        getCourseById: vi.fn()
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

    let useCase: DownloadCourse;

    beforeEach(() => {
        vi.clearAllMocks();
        useCase = new DownloadCourse({
            courseRepo: mockCourseRepo,
            downloadGuides: mockDownloadGuides,
            downloadVideos: mockDownloadVideos,
            namingService: new AssetNamingService(),
            logger: mockLogger,
        });
    });

    it('should log and exit if course not found', async () => {
        mockCourseRepo.getCourseById.mockReturnValue(null);
        
        await useCase.execute({courseInput: 'course123', type: 'all'});
        
        expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('No se encontró el curso'));
        expect(mockDownloadGuides.executeForCourse).not.toHaveBeenCalled();
        expect(mockDownloadVideos.executeForCourse).not.toHaveBeenCalled();
    });

    it('should call both guides and videos when type is all', async () => {
        const mockCourse = { id: 'course1', title: 'Course 1' };
        mockCourseRepo.getCourseById.mockReturnValue(mockCourse);
        
        await useCase.execute({courseInput: 'course1', type: 'all'});
        
        expect(mockDownloadGuides.executeForCourse).toHaveBeenCalledWith('course1');
        expect(mockDownloadVideos.executeForCourse).toHaveBeenCalledWith('course1');
    });

    it('should only call guides download when type is guide', async () => {
        mockCourseRepo.getCourseById.mockReturnValue({ id: 'c1', title: 'T1' });
        
        await useCase.execute({courseInput: 'c1', type: 'guide'});
        
        expect(mockDownloadGuides.executeForCourse).toHaveBeenCalledWith('c1');
        expect(mockDownloadVideos.executeForCourse).not.toHaveBeenCalled();
    });

    it('should only call videos download when type is video', async () => {
        mockCourseRepo.getCourseById.mockReturnValue({ id: 'c1', title: 'T1' });
        
        await useCase.execute({courseInput: 'c1', type: 'video'});
        
        expect(mockDownloadVideos.executeForCourse).toHaveBeenCalledWith('c1');
        expect(mockDownloadGuides.executeForCourse).not.toHaveBeenCalled();
    });
});
