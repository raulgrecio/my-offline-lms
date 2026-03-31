import { describe, it, expect, vi, beforeEach, Mocked } from 'vitest';

import { type ILogger } from '@core/logging';

import { DiskInterceptedDataRepository } from '@scraper/features/platform-sync/infrastructure/DiskInterceptedDataRepository';

describe('DiskInterceptedDataRepository', () => {
  const mockBaseDir = '/mock/intercepted';
  let repo: DiskInterceptedDataRepository;

  const mockFs = {
    exists: vi.fn().mockResolvedValue(true),
    mkdir: vi.fn().mockResolvedValue(undefined),
    readdir: vi.fn(),
    readFile: vi.fn(),
    unlink: vi.fn().mockResolvedValue(undefined),
    rename: vi.fn().mockResolvedValue(undefined),
    rm: vi.fn().mockResolvedValue(undefined),
  } as any;

  const mockPath = {
    join: vi.fn((...args) => args.join('/')),
  } as any;

  const mockLogger: Mocked<ILogger> = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    withContext: vi.fn().mockReturnThis()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new DiskInterceptedDataRepository({
      fs: mockFs,
      path: mockPath,
      getInterceptedDir: async () => '/never/called',
      baseDir: mockBaseDir,
      logger: mockLogger
    });
  });

  it('should ensure directory exists before reading payloads', async () => {
    mockFs.readdir.mockResolvedValue([]);
    mockFs.exists.mockResolvedValue(false);

    await repo.getPendingLearningPaths();

    expect(mockFs.mkdir).toHaveBeenCalledWith(mockBaseDir, { recursive: true });
  });

  it('should skip directory creation if it already exists', async () => {
    mockFs.exists.mockResolvedValue(true);
    await repo.getPendingLearningPaths();
    expect(mockFs.mkdir).not.toHaveBeenCalled();
  });

  it('should skip initialization if already done', async () => {
    mockFs.exists.mockResolvedValue(true);
    await repo.getPendingLearningPaths(); // first call init
    await repo.getPendingLearningPaths(); // second call should skip init branch
  });

  it('should return pending learning paths correctly filtering files', async () => {
    mockFs.readdir.mockResolvedValue([
      'content_learning_path_123_pagedata.json',
      'ignore_this_file.txt'
    ]);
    mockFs.readFile.mockResolvedValue('{"id": "123"}');

    const result = await repo.getPendingLearningPaths();

    expect(result).toHaveLength(1);
    expect(result[0].filePath).toBe('/mock/intercepted/content_learning_path_123_pagedata.json');
  });

  it('should return pending for a specific learning path', async () => {
    mockFs.readdir.mockResolvedValue([
      'content_learning_path_123_pagedata.json',
      'content_learning_path_456_pagedata.json'
    ]);
    mockFs.readFile.mockResolvedValue('{}');

    const result = await repo.getPendingForLearningPath('123');

    expect(result).toHaveLength(1);
    expect(result[0].filePath).toContain('123');
  });

  it('should return all pending courses', async () => {
    mockFs.readdir.mockResolvedValue([
      'content_courses_789_metadata.json',
      'content_courses_999_metadata.json'
    ]);
    mockFs.readFile.mockResolvedValue('{}');

    const result = await repo.getPendingCourses();

    expect(result).toHaveLength(2);
  });

  it('should return pending courses correct filtered', async () => {
    mockFs.readdir.mockResolvedValue([
      'content_courses_789_metadata.json',
      'content_courses_999_metadata.json'
    ]);
    mockFs.readFile.mockResolvedValue('{}');

    const result = await repo.getPendingForCourse('789');

    expect(result).toHaveLength(1);
    expect(result[0].filePath).toContain('789');
  });

  it('should delete payload if exists', async () => {
    mockFs.exists.mockResolvedValue(true);
    await repo.deletePayload('/f.json');
    expect(mockFs.unlink).toHaveBeenCalledWith('/f.json');
  });

  it('should skip deletePayload if file does not exist', async () => {
    mockFs.exists.mockResolvedValue(false);
    await repo.deletePayload('/missing.json');
    expect(mockFs.unlink).not.toHaveBeenCalled();
  });

  it('should catch error in deletePayload if unlink fails', async () => {
    mockFs.exists.mockResolvedValue(true);
    mockFs.unlink.mockRejectedValue(new Error('FAIL'));
    await expect(repo.deletePayload('/f.json')).resolves.not.toThrow();
  });

  describe('markAsProcessed', () => {
    it('should rename payload', async () => {
      await repo.markAsProcessed('/f.json');
      expect(mockFs.rename).toHaveBeenCalledWith('/f.json', '/f.json.processed');
    });

    it('should warn if rename fails', async () => {
      mockFs.rename.mockRejectedValue(new Error('FAIL'));
      await repo.markAsProcessed('/f.json');
      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });

  describe('deleteWorkspace', () => {
    it('should call rm if supported', async () => {
      await repo.deleteWorkspace();
      expect(mockFs.rm).toHaveBeenCalled();
    });

    it('should warn if rm NOT supported', async () => {
      const repoNoRm = new DiskInterceptedDataRepository({
        fs: { ...mockFs, rm: undefined },
        path: mockPath,
        getInterceptedDir: async () => mockBaseDir,
        logger: mockLogger
      });
      await repoNoRm.deleteWorkspace();
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('does not support \'rm\''));
    });

    it('should error if rm fails', async () => {
      mockFs.rm.mockRejectedValue(new Error('FAIL'));
      await repo.deleteWorkspace();
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});
