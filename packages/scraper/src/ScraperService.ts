import { ConsoleLogger } from '@core/logging';
import { type IDatabase } from '@core/database';
import { type DownloadType } from '@core/domain';
import { NodeFileSystem, NodePath, UniversalFileSystem, HttpFileSystem, AssetPathResolver } from '@core/filesystem';

import { env } from './config/env';
import { PLATFORM } from './config/platform';
import { getAssetPathsConfig, getMonorepoRoot, getAuthState, getAuthDir, getInterceptedDir } from './config/paths';
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
  DiskInterceptedDataRepositoryFactory,
  SQLiteLearningPathRepository,
  OraclePlatformUrlProvider,
  SyncCourse,
  SyncLearningPath,
  GetAvailableContent
} from './features/platform-sync';
import {
  ScraperTask,
  SQLiteTaskRepository,
  type ITaskRepository,
  CreateTask,
  UpdateTask,
  GetActiveTask,
  GetTaskById,
  CancelTask,
  StartTask,
  CreateTaskInput,
  UpdateTaskInput
} from './features/task-management';
import { ScraperOrchestrator } from './features/shared';
import { BrowserProvider, BrowserInterceptor } from './platform/browser';
import { getDb } from './platform/database';

export interface ScraperServiceConfig {
  keepTempWorkspaces?: boolean;
}

export interface ScraperDependencies {
  db: IDatabase;
  logger: ConsoleLogger;
  taskRepo: ITaskRepository;
  courseRepo: SQLiteCourseRepository;
  assetRepo: SQLiteAssetRepository;
  pathRepo: SQLiteLearningPathRepository;
  browserProvider: BrowserProvider;
  namingService: AssetNamingService;
  authSessionStorage: DiskAuthSessionStorage;
  interceptedDataRepoFactory: DiskInterceptedDataRepositoryFactory;
  browserInterceptor: BrowserInterceptor;
  assetPathResolver: AssetPathResolver;
  urlProvider: OraclePlatformUrlProvider;
  universalFs: UniversalFileSystem;
  nodePath: NodePath;
}

export class ScraperService {
  private readonly createTaskUseCase: CreateTask;
  private readonly updateTaskUseCase: UpdateTask;
  private readonly getActiveTaskUseCase: GetActiveTask;
  private readonly getTaskByIdUseCase: GetTaskById;
  private readonly cancelTaskUseCase: CancelTask;
  private readonly validateAuthUseCase: ValidateAuthSession;
  private readonly loginUseCase: AuthSession;
  private readonly startTaskUseCase: StartTask;
  private readonly getAvailableContentUseCase: GetAvailableContent;
  private readonly orchestrator: ScraperOrchestrator;

  private constructor(private readonly deps: ScraperDependencies) {
    this.createTaskUseCase = new CreateTask(deps.taskRepo);
    this.updateTaskUseCase = new UpdateTask(deps.taskRepo);
    this.getActiveTaskUseCase = new GetActiveTask(deps.taskRepo);
    this.getTaskByIdUseCase = new GetTaskById(deps.taskRepo);
    this.cancelTaskUseCase = new CancelTask(deps.taskRepo);

    this.validateAuthUseCase = new ValidateAuthSession({
      authStorage: deps.authSessionStorage,
      logger: deps.logger
    });

    this.loginUseCase = new AuthSession({
      browserProvider: deps.browserProvider,
      authStorage: deps.authSessionStorage,
      logger: deps.logger
    });

    this.startTaskUseCase = new StartTask(deps.taskRepo);

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
    const { loadScraperEnv } = await import('./config/env');
    loadScraperEnv();

    const logger = new ConsoleLogger();
    const nodeFs = new NodeFileSystem(logger);
    const nodePath = new NodePath();
    const universalFs = new UniversalFileSystem(nodeFs, logger);
    universalFs.registerRemote('http', new HttpFileSystem());

    const db = await getDb({ fsAdapter: nodeFs });
    const taskRepo = new SQLiteTaskRepository(db);

    const browserProvider = new BrowserProvider({
      fs: universalFs,
      path: nodePath,
      config: {
        chromeExecutablePath: env.CHROME_EXECUTABLE_PATH,
        authStateFile: await getAuthState(),
      },
      logger
    });

    const authSessionStorage = new DiskAuthSessionStorage({
      fs: universalFs,
      path: nodePath,
      getAuthDir,
    });

    const assetPathResolver = new AssetPathResolver({
      configPath: await getAssetPathsConfig(),
      monorepoRoot: await getMonorepoRoot(),
      fs: universalFs,
      path: nodePath,
      logger: logger,
    });

    const deps: ScraperDependencies = {
      db,
      logger,
      taskRepo,
      courseRepo: new SQLiteCourseRepository(db),
      assetRepo: new SQLiteAssetRepository(db),
      pathRepo: new SQLiteLearningPathRepository(db),
      browserProvider,
      namingService: new AssetNamingService(),
      authSessionStorage,
      interceptedDataRepoFactory: new DiskInterceptedDataRepositoryFactory(universalFs, nodePath, logger),
      browserInterceptor: new BrowserInterceptor({
        fs: universalFs,
        path: nodePath,
        logger,
        getInterceptedDir
      }),
      assetPathResolver,
      urlProvider: new OraclePlatformUrlProvider(),
      universalFs,
      nodePath
    };

    return new ScraperService(deps);
  }

  async syncCourse(url: string, taskId?: string) {
    const syncCourse = new SyncCourse({
      ...this.deps,
      courseRepository: this.deps.courseRepo,
      assetRepository: this.deps.assetRepo,
      config: {
        keepTempWorkspaces: env.KEEP_TEMP_WORKSPACES,
        selectors: { guidesTab: PLATFORM.SELECTORS.COURSE.GUIDES_TAB },
        oracleConstants: { videoTypeId: PLATFORM.CONSTANTS.ORACLE.VIDEO_TYPE_ID }
      }
    });

    await this.orchestrator!.run(
      { taskId, mainStep: 'Sincronizando metadatos del curso...', onCleanup: () => this.cleanup() },
      async () => {
        await syncCourse.execute({ courseInput: url });
      }
    );
  }

  async syncPath(url: string, taskId?: string) {
    const syncCourse = new SyncCourse({
      ...this.deps,
      courseRepository: this.deps.courseRepo,
      assetRepository: this.deps.assetRepo,
      config: {
        keepTempWorkspaces: env.KEEP_TEMP_WORKSPACES,
        selectors: { guidesTab: PLATFORM.SELECTORS.COURSE.GUIDES_TAB },
        oracleConstants: { videoTypeId: PLATFORM.CONSTANTS.ORACLE.VIDEO_TYPE_ID }
      }
    });

    const syncPath = new SyncLearningPath({
      ...this.deps,
      learningPathRepo: this.deps.pathRepo,
      courseRepo: this.deps.courseRepo,
      syncCourse,
      config: { keepTempWorkspaces: env.KEEP_TEMP_WORKSPACES }
    });

    await this.orchestrator!.run(
      { taskId, mainStep: 'Sincronizando ruta de aprendizaje...', onCleanup: () => this.cleanup() },
      async () => {
        await syncPath.execute({ pathInput: url });
      }
    );
  }

  async download(id: string, type: DownloadType = 'all', isPath: boolean = false, taskId?: string) {
    const assetStorage = new DiskAssetStorage({
      fs: this.deps.universalFs,
      path: this.deps.nodePath,
      resolver: this.deps.assetPathResolver
    });
    const videoDownloader = new YtDlpVideoDownloader({
      authSessionStorage: this.deps.authSessionStorage,
      logger: this.deps.logger
    });

    const downloadGuides = new DownloadGuides({
      ...this.deps,
      assetStorage,
      config: {
        keepTempImages: env.KEEP_TEMP_IMAGES,
        selectors: {
          iframe: PLATFORM.SELECTORS.GUIDE.IFRAME,
          flipbookPages: PLATFORM.SELECTORS.GUIDE.FLIPBOOK_PAGES
        }
      }
    });

    const downloadVideos = new DownloadVideos({
      ...this.deps,
      courseRepository: this.deps.courseRepo,
      assetRepository: this.deps.assetRepo,
      assetStorage,
      videoDownloader,
      config: {
        selectors: {
          video: {
            startBtn: PLATFORM.SELECTORS.VIDEO.START_BTN,
            playBtn: PLATFORM.SELECTORS.VIDEO.PLAY_BTN
          }
        }
      }
    });

    await this.orchestrator!.run(
      {
        taskId,
        mainStep: isPath ? 'Iniciando descarga de ruta...' : 'Iniciando descarga del curso...',
        successMessage: 'Descarga finalizada',
        onCleanup: () => this.cleanup()
      },
      async () => {
        if (isPath) {
          const syncCourse = new SyncCourse({
            ...this.deps,
            courseRepository: this.deps.courseRepo,
            assetRepository: this.deps.assetRepo,
            config: {
              keepTempWorkspaces: env.KEEP_TEMP_WORKSPACES,
              selectors: { guidesTab: PLATFORM.SELECTORS.COURSE.GUIDES_TAB },
              oracleConstants: { videoTypeId: PLATFORM.CONSTANTS.ORACLE.VIDEO_TYPE_ID }
            }
          });
          const syncPath = new SyncLearningPath({
            ...this.deps,
            learningPathRepo: this.deps.pathRepo,
            courseRepo: this.deps.courseRepo,
            syncCourse,
            config: { keepTempWorkspaces: env.KEEP_TEMP_WORKSPACES }
          });
          const downloader = new DownloadPath({
            learningPathRepo: this.deps.pathRepo,
            syncLearningPath: syncPath,
            downloadGuides,
            downloadVideos,
            namingService: this.deps.namingService,
            logger: this.deps.logger,
          });

          if (taskId) await this.updateTask(taskId, { progress: { step: 'Descargando contenidos de la ruta...' } });
          await downloader.execute({ pathInput: id, type });
        } else {
          const downloader = new DownloadCourse({
            courseRepo: this.deps.courseRepo,
            downloadGuides,
            downloadVideos,
            namingService: this.deps.namingService,
            logger: this.deps.logger,
          });

          if (taskId) await this.updateTask(taskId, { progress: { step: 'Descargando contenidos del curso...' } });
          await downloader.execute({ courseInput: id, type });
        }
      }
    );
  }

  async createTask(data: CreateTaskInput): Promise<string> {
    return this.createTaskUseCase.execute(data);
  }

  async updateTask(id: string, data: Omit<UpdateTaskInput, "id">) {
    await this.updateTaskUseCase.execute({ id, ...data });
  }

  async getActiveTask() {
    return this.getActiveTaskUseCase.execute();
  }

  async getTaskById(id: string) {
    return this.getTaskByIdUseCase.execute({ id });
  }

  async cancelTask(id: string) {
    await this.cancelTaskUseCase.execute({ id });
  }

  async getAvailableContent() {
    return this.getAvailableContentUseCase.execute();
  }

  async checkAuth(): Promise<boolean> {
    try {
      return await this.validateAuthUseCase.execute();
    } finally {
      await this.cleanup();
    }
  }

  async login(): Promise<void> {
    try {
      await this.loginUseCase.execute({
        baseUrl: env.PLATFORM_BASE_URL,
        interactive: false
      });

    } catch (err) {
      this.deps.logger.error("Error en login interactivo:", err);
      throw err;
    }
  }

  private async cleanup() {
    await this.deps.browserProvider.close();
  }
}
