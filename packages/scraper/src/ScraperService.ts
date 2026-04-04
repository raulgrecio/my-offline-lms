import { ConsoleLogger, FileLogger, CompositeLogger, type ILogger } from '@core/logging';
import { type IDatabase } from '@core/database';
import { type DownloadType } from '@core/domain';
import { NodeFileSystem, NodePath, UniversalFileSystem, HttpFileSystem, AssetPathResolver } from '@core/filesystem';

import { env } from './config/env';
import { PLATFORM } from './config/platform';
import { getAssetPathsConfig, getAuthState, getAuthDir, getInterceptedDir, getMonorepoRoot, getLogsFile } from './config/paths';
import {
  AssetNamingService,
  SQLiteAssetRepository,
  DiskAssetStorage,
  YtDlpVideoDownloader,
  DownloadCourse,
  DownloadGuides,
  DownloadPath,
  DownloadVideos
} from './features/asset-download';
import {
  DiskAuthSessionStorage,
  AuthSession,
  ValidateAuthSession
} from './features/auth-session';
import {
  SQLiteCourseRepository,
  DiskInterceptedDataRepository,
  type InterceptedRepoCreator,
  SQLiteLearningPathRepository,
  OraclePlatformUrlProvider,
  SyncCourse,
  SyncLearningPath,
  GetAvailableContent
} from './features/platform-sync';
import {
  SQLiteTaskRepository,
  type ITaskRepository,
  CreateTask,
  UpdateTask,
  GetActiveTask,
  GetTaskById,
  CancelTask,
  StartTask,
  GetAllTasks,
  DeleteTask,
  type CreateTaskInput,
  type ScraperTaskType,
} from './features/task-management';
import { ScraperOrchestrator } from './features/shared';
import { BrowserProvider, BrowserInterceptor } from './platform/browser';
import { getDb } from './platform/database';

export interface ScraperDependencies {
  db: IDatabase;
  logger: ILogger;
  taskRepo: ITaskRepository;
  courseRepo: SQLiteCourseRepository;
  assetRepo: SQLiteAssetRepository;
  pathRepo: SQLiteLearningPathRepository;
  browserProvider: BrowserProvider;
  namingService: AssetNamingService;
  assetPathResolver: AssetPathResolver;
  authSessionStorage: DiskAuthSessionStorage;
  createInterceptedRepo: InterceptedRepoCreator;
  urlProvider: OraclePlatformUrlProvider;
  universalFs: UniversalFileSystem;
  nodePath: NodePath;
}

export class ScraperService {
  private static instance: ScraperService;

  private orchestrator: ScraperOrchestrator;
  private createTaskUseCase: CreateTask;
  private updateTaskUseCase: UpdateTask;
  private getActiveTaskUseCase: GetActiveTask;
  private getTaskByIdUseCase: GetTaskById;
  private cancelTaskUseCase: CancelTask;
  private validateAuthUseCase: ValidateAuthSession;
  private loginUseCase: AuthSession;
  private getAvailableContentUseCase: GetAvailableContent;
  private startTaskUseCase: StartTask;
  private getAllTasksUseCase: GetAllTasks;
  private deleteTaskUseCase: DeleteTask;

  public isLoggingIn = false;

  private constructor(private readonly deps: ScraperDependencies) {
    this.createTaskUseCase = new CreateTask(deps.taskRepo);
    this.updateTaskUseCase = new UpdateTask(deps.taskRepo);
    this.getActiveTaskUseCase = new GetActiveTask(deps.taskRepo);
    this.getTaskByIdUseCase = new GetTaskById(deps.taskRepo);
    this.cancelTaskUseCase = new CancelTask(deps.taskRepo);
    this.startTaskUseCase = new StartTask(deps.taskRepo);
    this.getAllTasksUseCase = new GetAllTasks(deps.taskRepo);
    this.deleteTaskUseCase = new DeleteTask(deps.taskRepo);

    this.validateAuthUseCase = new ValidateAuthSession({
      authStorage: deps.authSessionStorage,
      logger: deps.logger
    });

    this.loginUseCase = new AuthSession({
      browserProvider: deps.browserProvider,
      authStorage: deps.authSessionStorage,
      logger: deps.logger
    });

    this.orchestrator = new ScraperOrchestrator({
      validator: this.validateAuthUseCase,
      updateTask: this.updateTaskUseCase,
      getTaskById: this.getTaskByIdUseCase,
      startTask: this.startTaskUseCase,
      logger: deps.logger
    });

    this.getAvailableContentUseCase = new GetAvailableContent(
      deps.courseRepo,
      deps.pathRepo,
      deps.urlProvider,
      deps.universalFs,
      deps.nodePath
    );
  }

  static async create(): Promise<ScraperService> {
    // Patrón de persistencia del Singleton en entorno de desarrollo (HMR).
    // Evita que el estado se pierda cuando Vite o Astro recargan los módulos en caliente.
    const isDev = process.env.NODE_ENV !== 'production';
    const globalContainer = globalThis as any;

    if (isDev && globalContainer.__SCRAPER_INSTANCE__) {
      ScraperService.instance = globalContainer.__SCRAPER_INSTANCE__;
      return ScraperService.instance;
    }

    if (ScraperService.instance) {
      if (isDev) globalContainer.__SCRAPER_INSTANCE__ = ScraperService.instance;
      return ScraperService.instance;
    }

    const { loadScraperEnv } = await import('./config/env');
    loadScraperEnv();

    const consoleLogger = new ConsoleLogger();
    const logFile = await getLogsFile();
    const fileLogger = new FileLogger(logFile);
    const logger = new CompositeLogger([consoleLogger, fileLogger]);
    const nodeFs = new NodeFileSystem(logger);
    const nodePath = new NodePath();
    const universalFs = new UniversalFileSystem(nodeFs, logger);
    universalFs.registerRemote('http', new HttpFileSystem());

    const db = await getDb({ fsAdapter: nodeFs });
    const taskRepo = new SQLiteTaskRepository(db);

    const configPath = await getAssetPathsConfig();
    const monorepoRoot = await getMonorepoRoot();
    const assetPathResolver = new AssetPathResolver({
      configPath,
      monorepoRoot,
      fs: universalFs,
      path: nodePath,
      logger
    });

    const authStateFile = await getAuthState();

    const browserProvider = new BrowserProvider({
      fs: universalFs,
      path: nodePath,
      config: {
        chromeExecutablePath: env.CHROME_EXECUTABLE_PATH,
        authStateFile,
      },
      logger
    });

    const courseRepo = new SQLiteCourseRepository(db);
    const assetRepo = new SQLiteAssetRepository(db);
    const pathRepo = new SQLiteLearningPathRepository(db);

    const authSessionStorage = new DiskAuthSessionStorage({
      fs: universalFs,
      path: nodePath,
      getAuthDir
    });

    const createInterceptedRepo: InterceptedRepoCreator = (baseDir?: string) => new DiskInterceptedDataRepository({
      fs: universalFs,
      path: nodePath,
      getInterceptedDir,
      baseDir,
      logger
    });

    ScraperService.instance = new ScraperService({
      db,
      logger,
      taskRepo,
      courseRepo,
      assetRepo,
      pathRepo,
      browserProvider,
      namingService: new AssetNamingService(),
      assetPathResolver,
      authSessionStorage,
      createInterceptedRepo,
      urlProvider: new OraclePlatformUrlProvider(),
      universalFs,
      nodePath
    });

    if (isDev) (globalThis as any).__SCRAPER_INSTANCE__ = ScraperService.instance;

    return ScraperService.instance;
  }

  async validateAuth() {
    return await this.validateAuthUseCase.execute();
  }

  async getSessionExpiry() {
    return await this.deps.authSessionStorage.getSessionExpiry();
  }

  async login({ interactive = false, headless = false, baseUrl }: { 
    interactive?: boolean, 
    headless?: boolean, 
    baseUrl?: string 
  } = {}) {
    this.isLoggingIn = true;
    try {
      await this.loginUseCase.execute({ interactive, headless, baseUrl });
    } finally {
      if (interactive) {
        this.isLoggingIn = false;
      }
    }
  }

  async saveActiveSession() {
    this.deps.logger.info("Guardando sesión activa...");
    try {
      const result = await this.loginUseCase.saveActiveSession();
      if (result.success) {
        this.isLoggingIn = false;
        return { success: true };
      }
      return result;
    } catch (e: any) {
      this.deps.logger.error(`Error al guardar la sesión: ${e.message}`);
      return { success: false, error: e.message };
    }
  }

  async getTasks() {
    return await this.getAllTasksUseCase.execute();
  }

  async getActiveTask() {
    return await this.getActiveTaskUseCase.execute();
  }

  async getTaskById(id: string) {
    return await this.getTaskByIdUseCase.execute({ id });
  }

  async createTask(input: CreateTaskInput) {
    return await this.createTaskUseCase.execute(input);
  }

  async cancelTask(id: string) {
    return this.cancelTaskUseCase.execute({ id });
  }

  async startTask(id: string) {
    return await this.startTaskUseCase.execute({ id });
  }

  async deleteTask(id: string) {
    return this.deleteTaskUseCase.execute({ id });
  }

  async getAvailableContent() {
    return await this.getAvailableContentUseCase.execute();
  }

  async syncCourse({ url, taskId }: { url: string; taskId: string }) {
    const browserInterceptor = new BrowserInterceptor({
      fs: this.deps.universalFs,
      path: this.deps.nodePath,
      logger: this.deps.logger,
      getInterceptedDir
    });

    const syncCourse = new SyncCourse({
      browserProvider: this.deps.browserProvider,
      courseRepository: this.deps.courseRepo,
      assetRepository: this.deps.assetRepo,
      createInterceptedRepo: this.deps.createInterceptedRepo,
      browserInterceptor,
      urlProvider: this.deps.urlProvider,
      namingService: this.deps.namingService,
      logger: this.deps.logger,
      config: {
        keepTempWorkspaces: false,
        selectors: {
          guidesTab: PLATFORM.SELECTORS.COURSE.GUIDES_TAB
        },
        oracleConstants: {
          videoTypeId: PLATFORM.CONSTANTS.ORACLE.VIDEO_TYPE_ID
        }
      }
    });

    await this.orchestrator.run(
      { taskId, mainStep: 'Sincronizando metadatos del curso...', onCleanup: () => this.cleanup() },
      async () => {
        await syncCourse.execute({ courseInput: url });
      }
    );
  }

  async syncPath({ url, taskId }: { url: string; taskId: string }) {
    const browserInterceptor = new BrowserInterceptor({
      fs: this.deps.universalFs,
      path: this.deps.nodePath,
      logger: this.deps.logger,
      getInterceptedDir
    });

    const syncCourse = new SyncCourse({
      browserProvider: this.deps.browserProvider,
      courseRepository: this.deps.courseRepo,
      assetRepository: this.deps.assetRepo,
      createInterceptedRepo: this.deps.createInterceptedRepo,
      browserInterceptor,
      urlProvider: this.deps.urlProvider,
      namingService: this.deps.namingService,
      logger: this.deps.logger,
      config: {
        keepTempWorkspaces: false,
        selectors: {
          guidesTab: PLATFORM.SELECTORS.COURSE.GUIDES_TAB
        },
        oracleConstants: {
          videoTypeId: PLATFORM.CONSTANTS.ORACLE.VIDEO_TYPE_ID
        }
      }
    });

    const syncPath = new SyncLearningPath({
      browserProvider: this.deps.browserProvider,
      learningPathRepo: this.deps.pathRepo,
      courseRepo: this.deps.courseRepo,
      syncCourse,
      createInterceptedRepo: this.deps.createInterceptedRepo,
      browserInterceptor,
      urlProvider: this.deps.urlProvider,
      namingService: this.deps.namingService,
      logger: this.deps.logger,
      config: {
        keepTempWorkspaces: false
      }
    });

    await this.orchestrator.run(
      { taskId, mainStep: 'Sincronizando metadatos de la ruta...', onCleanup: () => this.cleanup() },
      async () => {
        await syncPath.execute({ pathInput: url });
      }
    );
  }

  async download({ type, taskId, entityId, entityType }: {
    type: DownloadType;
    taskId: string;
    entityId: string;
    entityType: ScraperTaskType
  }) {
    const videoDownloader = new YtDlpVideoDownloader({
      authSessionStorage: this.deps.authSessionStorage,
      logger: this.deps.logger
    });

    const assetStorage = new DiskAssetStorage({
      fs: this.deps.universalFs,
      path: this.deps.nodePath,
      resolver: this.deps.assetPathResolver
    });

    const downloadGuides = new DownloadGuides({
      browserProvider: this.deps.browserProvider,
      courseRepo: this.deps.courseRepo,
      assetRepo: this.deps.assetRepo,
      assetStorage,
      namingService: this.deps.namingService,
      urlProvider: this.deps.urlProvider,
      logger: this.deps.logger,
      config: {
        keepTempImages: false,
        selectors: {
          iframe: PLATFORM.SELECTORS.GUIDE.IFRAME,
          flipbookPages: PLATFORM.SELECTORS.GUIDE.FLIPBOOK_PAGES
        }
      }
    });

    const downloadVideos = new DownloadVideos({
      browserProvider: this.deps.browserProvider,
      courseRepository: this.deps.courseRepo,
      assetRepository: this.deps.assetRepo,
      assetStorage,
      videoDownloader,
      namingService: this.deps.namingService,
      logger: this.deps.logger,
      config: {
        selectors: {
          video: {
            startBtn: PLATFORM.SELECTORS.VIDEO.START_BTN,
            playBtn: PLATFORM.SELECTORS.VIDEO.PLAY_BTN
          }
        }
      }
    });

    const downloadCourse = new DownloadCourse({
      courseRepo: this.deps.courseRepo,
      downloadGuides,
      downloadVideos,
      namingService: this.deps.namingService,
      logger: this.deps.logger
    });

    const downloadPath = new DownloadPath({
      learningPathRepo: this.deps.pathRepo,
      downloadGuides,
      downloadVideos,
      namingService: this.deps.namingService,
      logger: this.deps.logger
    });

    await this.orchestrator.run(
      { taskId, mainStep: 'Descargando recursos...', onCleanup: () => this.cleanup() },
      async () => {
        if (entityType === 'path') {
          await downloadPath.execute({ pathInput: entityId, type });
        } else {
          await downloadCourse.execute({ courseInput: entityId, type });
        }
      }
    );
  }

  async cleanup() {
    await this.deps.browserProvider.close();
  }
}
