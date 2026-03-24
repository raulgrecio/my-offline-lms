import { describe, it, expect, vi, beforeEach, Mocked } from 'vitest';

import { ILogger } from '@my-offline-lms/core/logging';
import { DiskInterceptedDataRepository } from '@features/platform-sync/infrastructure/DiskInterceptedDataRepository';

// Removed global fs and path mocks as dependencies are now injected

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

  it('should return pending learning paths correctly filtering files', async () => {
    mockFs.readdir.mockResolvedValue([
      'content_learning_path_123_pagedata.json',
      'ignore_this_file.txt',
      'content_courses_456_metadata.json'
    ] as any);

    mockFs.readFile.mockResolvedValue('{"id": "123"}' as any);

    const result = await repo.getPendingLearningPaths();

    expect(result).toHaveLength(1);
    expect(result[0].filePath).toBe('/mock/intercepted/content_learning_path_123_pagedata.json');
    expect(result[0].content).toBe('{"id": "123"}');
  });

  it('should return pending courses correctly filtering files', async () => {
    mockFs.readdir.mockResolvedValue([
      'content_learning_path_123_pagedata.json',
      'content_courses_789_metadata.json',
      'content_courses_999_metadata.json'
    ] as any);

    mockFs.readFile.mockImplementation(async (path: string) => {
      if (path.toString().includes('789')) return '{"id": "789"}';
      return '{"id": "999"}';
    });

    const result = await repo.getPendingCourses();

    expect(result).toHaveLength(2);
    expect(result[0].filePath).toBe('/mock/intercepted/content_courses_789_metadata.json');
    expect(result[1].filePath).toBe('/mock/intercepted/content_courses_999_metadata.json');
  });

  it('should return pending courses filtered by identifier', async () => {
    mockFs.readdir.mockResolvedValue([
      'content_learning_path_123_pagedata.json',
      'content_courses_789_metadata.json',
      'content_courses_999_metadata.json'
    ] as any);

    mockFs.readFile.mockImplementation(async (path: string) => {
      if (path.toString().includes('789')) return '{"id": "789"}';
      return '{"id": "999"}';
    });

    const result = await repo.getPendingForCourse('789');

    expect(result).toHaveLength(1);
    expect(result[0].filePath).toBe('/mock/intercepted/content_courses_789_metadata.json');
  });

  it('should delete payload', async () => {
    mockFs.exists.mockResolvedValue(true);
    await repo.deletePayload('/mock/intercepted/file.json');
    expect(mockFs.unlink).toHaveBeenCalledWith('/mock/intercepted/file.json');
  });

  it('should ignore non-existent payload when deleting', async () => {
    mockFs.exists.mockResolvedValue(true);
    mockFs.unlink.mockRejectedValue(new Error('ENOENT'));
    await expect(repo.deletePayload('/mock/intercepted/non_existent.json')).resolves.not.toThrow();
  });

  describe('markAsProcessed', () => {
    it('should rename payload when marking as processed', async () => {
      const filePath = '/mock/intercepted/file.json';
      await repo.markAsProcessed(filePath);
      expect(mockFs.rename).toHaveBeenCalledWith(filePath, `${filePath}.processed`);
    });

    it('should catch and log warning if rename fails', async () => {
      mockFs.rename.mockRejectedValue(new Error('Lock error'));
      await repo.markAsProcessed('/mock/intercepted/locked.json');

      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Could not mark as processed'));
    });
  });

  it('should delete workspace', async () => {
    await repo.deleteWorkspace();
    expect(mockFs.rm).toHaveBeenCalledWith(mockBaseDir, { recursive: true, force: true });
  });
});
