import { describe, it, expect, vi, beforeEach } from 'vitest';
import { type ILogger } from '@core/logging';

import { AssetNamingService, DownloadPath } from '@scraper/features/asset-download';

describe('DownloadPath Use Case', () => {
  const mockLearningPathRepo = {
    getCoursesForPath: vi.fn()
  } as any;

  const mockDownloadGuides = {
    execute: vi.fn()
  } as any;

  const mockDownloadVideos = {
    execute: vi.fn()
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
      downloadGuides: mockDownloadGuides,
      downloadVideos: mockDownloadVideos,
      namingService: new AssetNamingService(),
      logger: mockLogger,
    });
  });

  it('should warn and exit if no courses found for path', async () => {
    mockLearningPathRepo.getCoursesForPath.mockReturnValue([]);

    await useCase.execute({ pathInput: 'path123', type: 'all' });

    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('No se encontraron cursos'));
    expect(mockDownloadGuides.execute).not.toHaveBeenCalled();
    expect(mockDownloadVideos.execute).not.toHaveBeenCalled();
  });

  it('should call both guides and videos when type is all', async () => {
    const mockCourses = [
      { id: 'course1', title: 'Course 1', orderIndex: 1 },
      { id: 'course2', title: 'Course 2', orderIndex: 2 }
    ];
    mockLearningPathRepo.getCoursesForPath.mockReturnValue(mockCourses);

    await useCase.execute({ pathInput: 'path123', type: 'all' });

    expect(mockDownloadGuides.execute).toHaveBeenCalledTimes(2);
    expect(mockDownloadVideos.execute).toHaveBeenCalledTimes(2);
    expect(mockDownloadGuides.execute).toHaveBeenCalledWith(expect.objectContaining({ courseId: 'course1' }), undefined);
    expect(mockDownloadVideos.execute).toHaveBeenCalledWith(expect.objectContaining({ courseId: 'course1' }), undefined);
    expect(mockDownloadGuides.execute).toHaveBeenCalledWith(expect.objectContaining({ courseId: 'course2' }), undefined);
    expect(mockDownloadVideos.execute).toHaveBeenCalledWith(expect.objectContaining({ courseId: 'course2' }), undefined);
  });

  it('should only call guides download when type is guide', async () => {
    mockLearningPathRepo.getCoursesForPath.mockReturnValue([{ id: 'c1', title: 'T1', orderIndex: 1 }]);

    await useCase.execute({ pathInput: 'p1', type: 'guide' });

    expect(mockDownloadGuides.execute).toHaveBeenCalledWith(expect.objectContaining({ courseId: 'c1' }), undefined);
    expect(mockDownloadVideos.execute).not.toHaveBeenCalled();
  });

  it('should only call videos download when type is video', async () => {
    mockLearningPathRepo.getCoursesForPath.mockReturnValue([{ id: 'c1', title: 'T1', orderIndex: 1 }]);

    await useCase.execute({ pathInput: 'p1', type: 'video' });

    expect(mockDownloadVideos.execute).toHaveBeenCalledWith(expect.objectContaining({ courseId: 'c1' }), undefined);
    expect(mockDownloadGuides.execute).not.toHaveBeenCalled();
  });
});
