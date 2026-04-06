import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GetAvailableContent } from '@scraper/features/platform-sync/application/GetAvailableContent';

// Mock config
vi.mock('@scraper/config', () => ({
  getInterceptedDir: vi.fn().mockResolvedValue('/tmp/intercepted'),
}));

describe('GetAvailableContent Use Case', () => {
  const mockCourseRepo = {
    getCoursesWithSyncStatus: vi.fn(),
  } as any;

  const mockPathRepo = {
    getAllLearningPaths: vi.fn(),
  } as any;

  const mockUrlProvider = {
    getCourseUrl: vi.fn(args => `http://course/${args.slug}/${args.id}`),
    getLearningPathUrl: vi.fn(args => `http://path/${args.id}`),
  } as any;

  const mockFs = {
    exists: vi.fn(),
    readdir: vi.fn(),
    stat: vi.fn(),
    readFile: vi.fn(),
  } as any;

  const mockPath = {
    join: vi.fn((...args) => args.join('/')),
  } as any;

  let useCase: GetAvailableContent;

  beforeEach(() => {
    vi.clearAllMocks();
    useCase = new GetAvailableContent(
      mockCourseRepo,
      mockPathRepo,
      mockUrlProvider,
      mockFs,
      mockPath
    );
  });

  it('should combine database and intercepted content', async () => {
    // 1. Setup DB
    mockCourseRepo.getCoursesWithSyncStatus.mockReturnValue([
      { id: 'C1', title: 'Course 1', slug: 'c1', totalAssets: 10, downloadedAssets: 10 }
    ]);
    mockPathRepo.getAllLearningPaths.mockReturnValue([
      { id: 'P1', title: 'Path 1', slug: 'p1' }
    ]);

    // 2. Setup Filesystem Discovery
    mockFs.exists.mockResolvedValue(true);
    mockFs.readdir
      .mockResolvedValueOnce(['folder1', 'folder2']) // root folders
      .mockResolvedValueOnce(['my_metadata.json']) // folder1 contents
      .mockResolvedValueOnce([]); // folder2 contents

    mockFs.stat.mockResolvedValue({ isDirectory: () => true });

    const payload = JSON.stringify({
      data: {
        id: 'C2',
        name: 'Course Intercepted',
        modules: [{
          components: [
            { typeId: '1' }, { typeId: '1' }, // 2 videos
            { typeId: '2' } // 1 guide
          ]
        }]
      }
    });
    mockFs.readFile.mockResolvedValue(payload);

    const result = await useCase.execute();

    expect(result.courses).toHaveLength(2);
    expect(result.courses).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'C1', source: 'database', isComplete: true }),
      expect.objectContaining({
        id: 'C2',
        source: 'intercepted',
        totalVideos: 2,
        totalGuides: 1,
        totalAssets: 3
      })
    ]));
    expect(result.paths).toHaveLength(1);
    expect(result.paths[0].id).toBe('P1');
    expect(result.paths[0].url).toContain('/path/'); // fallback slug
  });

  it('should use fallback names and unwrapped JSON structure', async () => {
    mockCourseRepo.getCoursesWithSyncStatus.mockReturnValue([]);
    mockPathRepo.getAllLearningPaths.mockReturnValue([]);
    mockFs.exists.mockResolvedValue(true);
    mockFs.readdir
      .mockResolvedValueOnce(['F1'])      // 1st call: root discovery
      .mockResolvedValueOnce(['_metadata.json']); // 2nd call: enter F1

    // Unwrapped JSON and no 'name' but 'title'
    const payload = JSON.stringify({
      id: 'C3',
      title: 'Course Title Only'
    });
    mockFs.readFile.mockResolvedValue(payload);

    const result = await useCase.execute();
    expect(result.courses[0].title).toBe('Course Title Only');
    expect(result.courses[0].url).toContain('/path/C3'); // fallback slug
  });

  it('should use folder name if name and title are missing', async () => {
    mockFs.exists.mockResolvedValue(true);
    mockFs.readdir
      .mockResolvedValueOnce(['Course_Folder'])
      .mockResolvedValueOnce(['_metadata.json']);
    mockFs.stat.mockResolvedValue({ isDirectory: () => true });
    mockFs.readFile.mockResolvedValue(JSON.stringify({ id: 'C4' })); // empty JSON but ID

    const result = await useCase.execute();
    expect(result.courses[0].title).toBe('Course_Folder');
  });

  it('should handle missing interception directory', async () => {
    mockCourseRepo.getCoursesWithSyncStatus.mockReturnValue([]);
    mockPathRepo.getAllLearningPaths.mockReturnValue([]);
    mockFs.exists.mockResolvedValue(false);

    const result = await useCase.execute();
    expect(result.courses).toHaveLength(0);
    expect(mockFs.readdir).not.toHaveBeenCalled();
  });

  it('should ignore corrupt or invalid metadata files', async () => {
    mockCourseRepo.getCoursesWithSyncStatus.mockReturnValue([]);
    mockPathRepo.getAllLearningPaths.mockReturnValue([]);
    mockFs.exists.mockResolvedValue(true);
    mockFs.readdir.mockResolvedValueOnce(['f1']);
    mockFs.stat.mockResolvedValue({ isDirectory: () => true });
    mockFs.readdir.mockResolvedValueOnce(['_metadata.json']);

    mockFs.readFile.mockResolvedValue('INVALID JSON');

    await expect(useCase.execute()).resolves.toBeDefined();
    // Should catch and continue
  });

  it('should ignore files that are not directories in intercepted root', async () => {
    mockFs.exists.mockResolvedValue(true);
    mockFs.readdir.mockResolvedValueOnce(['file.txt']);
    mockFs.stat.mockResolvedValue({ isDirectory: () => false });

    const result = await useCase.execute();
    expect(mockFs.readdir).toHaveBeenCalledTimes(1); // Didn't enter file.txt
  });

  it('should handle learning paths without slugs using fallback', async () => {
    mockCourseRepo.getCoursesWithSyncStatus.mockReturnValue([]);
    mockPathRepo.getAllLearningPaths.mockReturnValue([
      { id: 'P_NO_SLUG', title: 'Path No Slug', slug: null }
    ]);
    mockFs.exists.mockResolvedValue(false);

    const result = await useCase.execute();
    expect(result.paths[0].url).toContain('path');
  });

  it('should handle errors during discovery and log them', async () => {
    mockFs.exists.mockRejectedValue(new Error('Disk error'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

    await useCase.execute();
    expect(consoleSpy).toHaveBeenCalledWith('[Discovery Error]:', expect.any(Error));
  });
});
