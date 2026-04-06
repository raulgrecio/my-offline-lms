import { describe, it, expect, vi, beforeEach } from 'vitest';

import { generateId } from '@core/domain';

import { ScraperService } from '@scraper/ScraperService';

// Mock dependencies
const mockDeps: any = {
  taskRepo: {
    findById: vi.fn(),
    save: vi.fn(),
    update: vi.fn(),
  },
  urlProvider: {
    resolveCourseUrl: vi.fn(),
    resolveLearningPathUrl: vi.fn(),
  },
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    withContext: vi.fn().mockReturnThis(),
  },
  // Add other required deps as null/mocks
  db: {},
  courseRepo: {},
  assetRepo: {},
  pathRepo: {},
  browserProvider: {},
  namingService: {},
  assetPathResolver: {},
  authSessionStorage: {},
  createInterceptedRepo: vi.fn(),
  universalFs: {},
  nodePath: {},
};

describe('ScraperService', () => {
  let service: ScraperService;

  beforeEach(() => {
    vi.clearAllMocks();
    // Accessing private constructor for testing
    service = new (ScraperService as any)(mockDeps);
  });

  describe('ID Resolution Helpers', () => {
    it('should resolve course ID from URL', () => {
      mockDeps.urlProvider.resolveCourseUrl.mockReturnValue({ courseId: '123' });
      const id = service.resolveCourseId('https://example.com/course/123');
      expect(id).toBe('123');
      expect(mockDeps.urlProvider.resolveCourseUrl).toHaveBeenCalledWith('https://example.com/course/123');
    });

    it('should resolve path ID from URL', () => {
      mockDeps.urlProvider.resolveLearningPathUrl.mockReturnValue({ pathId: '456' });
      const id = service.resolvePathId('https://example.com/path/456');
      expect(id).toBe('456');
      expect(mockDeps.urlProvider.resolveLearningPathUrl).toHaveBeenCalledWith('https://example.com/path/456');
    });
  });

  describe('ensureTaskExists', () => {
    it('should create a task if it does not exist', async () => {
      const taskId = generateId();
      const input = { id: taskId, type: 'course' as any, url: 'https://test.com', targetId: '123' };

      mockDeps.taskRepo.findById.mockResolvedValue(null);

      await (service as any).ensureTaskExists(input);

      expect(mockDeps.taskRepo.findById).toHaveBeenCalledWith(taskId);
      expect(mockDeps.taskRepo.save).toHaveBeenCalled();
      expect(mockDeps.logger.info).toHaveBeenCalledWith(expect.stringContaining('no encontrada'));
    });

    it('should NOT create a task if it already exists', async () => {
      const taskId = generateId();
      const input = { id: taskId, type: 'course' as any, url: 'https://test.com' };

      mockDeps.taskRepo.findById.mockResolvedValue({ id: taskId });

      await (service as any).ensureTaskExists(input);

      expect(mockDeps.taskRepo.findById).toHaveBeenCalledWith(taskId);
      expect(mockDeps.taskRepo.save).not.toHaveBeenCalled();
    });
  });
});
