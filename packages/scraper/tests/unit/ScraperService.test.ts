import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateId, DownloadType } from '@core/domain';
import { ScraperService } from '@scraper/ScraperService';
import { ScraperTaskAction, ScraperTaskCategory } from '@scraper/features/task-management';

// --- Module Mocks for Extended Coverage ---
vi.mock('@scraper/features/task-management', async () => {
  const actual = await vi.importActual<typeof import('@scraper/features/task-management')>('@scraper/features/task-management');
  function MockUseCase(this: any) {
    this.execute = vi.fn();
    return this;
  }
  return {
    ...actual,
    CreateTask: MockUseCase as any,
    UpdateTask: MockUseCase as any,
    GetActiveTask: MockUseCase as any,
    GetTaskById: MockUseCase as any,
    CancelTask: MockUseCase as any,
    StartTask: MockUseCase as any,
    GetAllTasks: MockUseCase as any,
    DeleteTask: MockUseCase as any,
    CleanupInterruptedTasks: MockUseCase as any,
    TaskOrchestrator: vi.fn().mockImplementation(function (this: any) {
      this.run = vi.fn((opts, work) => work());
      return this;
    }),
  };
});

vi.mock('@scraper/features/auth-session', async () => {
  const actual = await vi.importActual<typeof import('@scraper/features/auth-session')>('@scraper/features/auth-session');
  function MockUseCase(this: any) {
    this.execute = vi.fn();
    this.saveActiveSession = vi.fn();
    return this;
  }
  return {
    ...actual,
    AuthSession: MockUseCase as any,
    ValidateAuthSession: MockUseCase as any,
  };
});

vi.mock('@scraper/features/platform-sync', async () => {
  const actual = await vi.importActual<typeof import('@scraper/features/platform-sync')>('@scraper/features/platform-sync');
  function MockUseCase(this: any) {
    this.execute = vi.fn();
    return this;
  }
  return {
    ...actual,
    SyncCourse: MockUseCase as any,
    SyncLearningPath: MockUseCase as any,
    GetAvailableContent: MockUseCase as any,
  };
});

vi.mock('@scraper/features/asset-download', async () => {
    function MockUseCase(this: any) {
      this.execute = vi.fn();
      return this;
    }
    return {
      AssetNamingService: vi.fn().mockImplementation(function (this: any) {
          this.resolveCourseUrl = vi.fn().mockReturnValue({ courseId: '123' });
          this.slugify = vi.fn().mockReturnValue('slug');
          return this;
      }),
      SQLiteAssetRepository: vi.fn(),
      DiskAssetStorage: vi.fn(),
      YtDlpVideoDownloader: vi.fn(),
      DownloadCourse: MockUseCase as any,
      DownloadGuides: vi.fn(),
      DownloadPath: MockUseCase as any,
      DownloadVideos: MockUseCase as any,
    };
});

describe('ScraperService', () => {
  let mockDeps: any;
  let service: ScraperService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDeps = {
      taskRepo: {
        findById: vi.fn(),
        save: vi.fn(),
        update: vi.fn(),
      },
      urlProvider: {
        resolveCourseUrl: vi.fn().mockReturnValue({ courseId: '123' }),
        resolveLearningPathUrl: vi.fn().mockReturnValue({ pathId: '456' }),
        getCourseUrl: vi.fn().mockReturnValue('url'),
        getLearningPathUrl: vi.fn().mockReturnValue('url'),
      },
      logger: {
        info: vi.fn(),
        error: vi.fn(),
        withContext: vi.fn().mockReturnThis(),
      },
      courseRepo: { getCourseById: vi.fn(), saveCourse: vi.fn() },
      assetRepo: {},
      pathRepo: {},
      browserProvider: {},
      namingService: {
        resolveCourseUrl: vi.fn().mockReturnValue({ courseId: '123' }),
        slugify: vi.fn().mockReturnValue('slug')
      },
      assetPathResolver: {},
      authSessionStorage: { getCookies: vi.fn().mockResolvedValue([]) },
      authValidator: { getExpiry: vi.fn().mockReturnValue(null) },
      createInterceptedRepo: vi.fn(),
      universalFs: { registerRemote: vi.fn() },
      nodePath: {},
      db: {},
    };
    
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
      const spy = vi.spyOn((service as any).createTaskUseCase, 'execute').mockResolvedValue({ id: taskId });

      await (service as any).ensureTaskExists(input);

      expect(mockDeps.taskRepo.findById).toHaveBeenCalledWith(taskId);
      expect(spy).toHaveBeenCalled();
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

  describe('Delegation Coverage (Extended)', () => {
    it('should delegate auth validation', async () => {
      const spy = vi.spyOn((service as any).validateAuthUseCase, 'execute').mockResolvedValue(true);
      const result = await service.validateAuth();
      expect(result).toBe(true);
      expect(spy).toHaveBeenCalled();
    });

    it('should delegate login', async () => {
      const spy = vi.spyOn((service as any).loginUseCase, 'execute').mockResolvedValue(undefined);
      await service.login({ headless: true });
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ headless: true }));
    });

    it('should delegate getTasks', async () => {
      const spy = vi.spyOn((service as any).getAllTasksUseCase, 'execute').mockResolvedValue([]);
      await service.getTasks();
      expect(spy).toHaveBeenCalled();
    });

    it('should delegate deleteTask', async () => {
      const spy = vi.spyOn((service as any).deleteTaskUseCase, 'execute').mockResolvedValue(undefined);
      await service.deleteTask('1');
      expect(spy).toHaveBeenCalledWith({ id: '1' });
    });

    it('should delegate getActiveTask', async () => {
      const spy = vi.spyOn((service as any).getActiveTaskUseCase, 'execute').mockResolvedValue(null);
      await service.getActiveTask();
      expect(spy).toHaveBeenCalled();
    });

    it('should delegate getAvailableContent', async () => {
      const spy = vi.spyOn((service as any).getAvailableContentUseCase, 'execute').mockResolvedValue([]);
      await service.getAvailableContent();
      expect(spy).toHaveBeenCalled();
    });

    it('should handle cancelTask delegation', async () => {
      const spy = vi.spyOn((service as any).cancelTaskUseCase, 'execute').mockResolvedValue(undefined);
      await service.cancelTask('t1');
      expect(spy).toHaveBeenCalledWith({ id: 't1' });
    });
  });

  describe('startTask dispatcher', () => {
    it('should dispatch SYNC_COURSE', async () => {
      mockDeps.taskRepo.findById.mockResolvedValue({ id: '1', action: ScraperTaskAction.SYNC_COURSE, url: 'u' });
      const syncSpy = vi.spyOn(service, 'syncCourse').mockResolvedValue(undefined);

      await service.startTask('1');
      expect(syncSpy).toHaveBeenCalledWith({ url: 'u', taskId: '1' });
    });

    it('should dispatch SYNC_COURSE with automatic download', async () => {
      mockDeps.taskRepo.findById.mockResolvedValue({
        id: '1',
        action: ScraperTaskAction.SYNC_COURSE,
        url: 'u',
        metadata: { includeDownload: true, download: DownloadType.ALL }
      });
      vi.spyOn(service, 'syncCourse').mockResolvedValue(undefined);
      const downSpy = vi.spyOn(service, 'download').mockResolvedValue(undefined);

      await service.startTask('1');
      expect(downSpy).toHaveBeenCalled();
    });

    it('should dispatch SYNC_PATH with automatic download', async () => {
      mockDeps.taskRepo.findById.mockResolvedValue({
        id: '1',
        action: ScraperTaskAction.SYNC_PATH,
        url: 'u',
        metadata: { includeDownload: true, download: DownloadType.ALL }
      });
      vi.spyOn(service, 'syncPath').mockResolvedValue(undefined);
      const downSpy = vi.spyOn(service, 'download').mockResolvedValue(undefined);

      await service.startTask('1');
      expect(downSpy).toHaveBeenCalled();
    });

    it('should dispatch DOWNLOAD_PATH', async () => {
      mockDeps.taskRepo.findById.mockResolvedValue({ id: '1', action: ScraperTaskAction.DOWNLOAD_PATH, targetId: 'p1', metadata: { type: DownloadType.VIDEO } });
      const downSpy = vi.spyOn(service, 'download').mockResolvedValue(undefined);

      await service.startTask('1');
      expect(downSpy).toHaveBeenCalledWith(expect.objectContaining({ entityId: 'p1', entityType: 'path', download: DownloadType.VIDEO }));
    });

    it('should fallback to startTaskUseCase for unknown actions', async () => {
      mockDeps.taskRepo.findById.mockResolvedValue({ id: '1', action: 'UNKNOWN' });
      const spy = vi.spyOn((service as any).startTaskUseCase, 'execute').mockResolvedValue(undefined);
      await service.startTask('1');
      expect(spy).toHaveBeenCalledWith({ id: '1' });
    });

    it('should throw if task not found', async () => {
      mockDeps.taskRepo.findById.mockResolvedValue(null);
      await expect(service.startTask('404')).rejects.toThrow('no encontrada');
    });
  });

  describe('Integration Methods', () => {
    it('should run syncCourse', async () => {
      const runSpy = vi.spyOn((service as any).orchestrator, 'run');
      await service.syncCourse({ url: 'http://course', taskId: 't1' });
      expect(runSpy).toHaveBeenCalledWith(
        expect.objectContaining({ taskId: 't1', mainStep: 'Sincronizando curso' }),
        expect.any(Function)
      );
    });

    it('should return session detected status', () => {
      (service as any).loginUseCase.isLoginDetected = true;
      expect(service.isLoginDetected).toBe(true);
    });

    it('should get session expiry', async () => {
      await service.getSessionExpiry();
      expect(mockDeps.authValidator.getExpiry).toHaveBeenCalled();
    });

    it('should handle cleanup', async () => {
       await service.cleanup();
       // Void method, just check no throw
    });
  });

  describe('Singleton Factory', () => {
    it('should initialize via init and return same instance', async () => {
      const s1 = await ScraperService.init(mockDeps);
      const s2 = await ScraperService.init(mockDeps);
      expect(s1).toBe(s2);
    });
  });
});
