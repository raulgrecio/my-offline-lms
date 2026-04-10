import { describe, it, expect, vi, beforeEach } from 'vitest';
import { type ILogger } from '@core/logging';

import { DownloadCourse } from '@scraper/features/asset-download';
import { AssetNamingService } from '@scraper/features/asset-download';

describe('DownloadCourse Use Case', () => {
  const mockCourseRepo = {
    getCourseById: vi.fn()
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

    await useCase.execute({ courseInput: 'course123', type: 'all' });

    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('No se encontró el curso'));
    expect(mockDownloadGuides.execute).not.toHaveBeenCalled();
    expect(mockDownloadVideos.execute).not.toHaveBeenCalled();
  });

  it('should call both guides and videos when type is all', async () => {
    const mockCourse = { id: 'course1', title: 'Course 1' };
    mockCourseRepo.getCourseById.mockReturnValue(mockCourse);

    await useCase.execute({ courseInput: 'course1', type: 'all' });

    expect(mockDownloadGuides.execute).toHaveBeenCalledWith(expect.objectContaining({ courseId: 'course1' }), undefined);
    expect(mockDownloadVideos.execute).toHaveBeenCalledWith(expect.objectContaining({ courseId: 'course1' }), undefined);
  });

  it('should only call guides download when type is guide', async () => {
    mockCourseRepo.getCourseById.mockReturnValue({ id: 'c1', title: 'T1' });

    await useCase.execute({ courseInput: 'c1', type: 'guide' });

    expect(mockDownloadGuides.execute).toHaveBeenCalledWith(expect.objectContaining({ courseId: 'c1' }), undefined);
    expect(mockDownloadVideos.execute).not.toHaveBeenCalled();
  });

  it('should only call videos download when type is video', async () => {
    mockCourseRepo.getCourseById.mockReturnValue({ id: 'c1', title: 'T1' });

    await useCase.execute({ courseInput: 'c1', type: 'video' });

    expect(mockDownloadVideos.execute).toHaveBeenCalledWith(expect.objectContaining({ courseId: 'c1' }), undefined);
    expect(mockDownloadGuides.execute).not.toHaveBeenCalled();
  });

  it('should handle abortion signal', async () => {
    mockCourseRepo.getCourseById.mockReturnValue({ id: 'c1', title: 'T1' });
    const controller = new AbortController();
    controller.abort();

    await useCase.execute({ courseInput: 'c1', type: 'all' }, controller.signal);

    expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('CANCELADA'));
  });
});
