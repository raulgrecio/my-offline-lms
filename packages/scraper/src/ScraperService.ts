import { ConsoleLogger, FileLogger, EventLogger, LogBroker, type ILogger } from '@core/logging';
import { type IDatabase } from '@core/database';
import { DownloadType } from '@core/domain';
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
  ValidateAuthSession,
  OracleAuthValidator,
  type IAuthValidator
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
  CleanupInterruptedTasks,
  type CreateTaskInput,
  ScraperTaskCategory,
  ScraperTaskAction,
} from './features/task-management';
import { TaskOrchestrator } from './features/task-management';
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
  authValidator: IAuthValidator;
  createInterceptedRepo: InterceptedRepoCreator;
  urlProvider: OraclePlatformUrlProvider;
  universalFs: UniversalFileSystem;
  nodePath: NodePath;
}

export class ScraperService {
  private static instance: ScraperService;

  private orchestrator: TaskOrchestrator;
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
  private cleanupInterruptedTasksUseCase: CleanupInterruptedTasks;

  public isLoggingIn = false;

  get isLoginDetected(): boolean {
    return this.loginUseCase.isLoginDetected;
  }

  private constructor(private readonly deps: ScraperDependencies) {
    this.createTaskUseCase = new CreateTask(deps.taskRepo);
    this.updateTaskUseCase = new UpdateTask(deps.taskRepo);
    this.getActiveTaskUseCase = new GetActiveTask(deps.taskRepo);
    this.getTaskByIdUseCase = new GetTaskById(deps.taskRepo);
    this.cancelTaskUseCase = new CancelTask(deps.taskRepo);
    this.startTaskUseCase = new StartTask(deps.taskRepo);
    this.getAllTasksUseCase = new GetAllTasks(deps.taskRepo);
    this.deleteTaskUseCase = new DeleteTask(deps.taskRepo);
    this.cleanupInterruptedTasksUseCase = new CleanupInterruptedTasks(deps.taskRepo, deps.logger);

    this.validateAuthUseCase = new ValidateAuthSession({
      authStorage: deps.authSessionStorage,
      validator: deps.authValidator,
      logger: deps.logger
    });

    this.loginUseCase = new AuthSession({
      browserProvider: deps.browserProvider,
      authStorage: deps.authSessionStorage,
      validator: deps.authValidator,
      logger: deps.logger
    });

    this.orchestrator = new TaskOrchestrator({
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

  static async init(deps: ScraperDependencies): Promise<ScraperService> {
    if (!ScraperService.instance) {
      ScraperService.instance = new ScraperService(deps);
      // Cleanup orphaned tasks on startup
      await ScraperService.instance.cleanupInterruptedTasksUseCase.execute();
    }
    return ScraperService.instance;
  }

  static async create(): Promise<ScraperService> {
    if (ScraperService.instance) {
      return ScraperService.instance;
    }

    const { loadScraperEnv } = await import('./config/env');
    loadScraperEnv();

    const eventLogger = new EventLogger();
    const nodePath = new NodePath();
    const logFile = await getLogsFile();

    // 1. Setup LogBroker subscribers
    LogBroker.clearTransports();
    LogBroker.addTransport(new ConsoleLogger(), { minLevel: 'info' });

    // File output (using a base FS that doesn't log to avoid loops)
    const baseFs = new NodeFileSystem();
    LogBroker.addTransport(new FileLogger(logFile, baseFs, nodePath), { minLevel: 'debug' });


    // 2. Create the final FS and other dependencies using the event logger
    const nodeFs = new NodeFileSystem(eventLogger);
    const universalFs = new UniversalFileSystem(nodeFs, eventLogger);
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
      logger: eventLogger
    });

    const authStateFile = await getAuthState();

    const browserProvider = new BrowserProvider({
      fs: universalFs,
      path: nodePath,
      config: {
        chromeExecutablePath: env.CHROME_EXECUTABLE_PATH,
        authStateFile,
      },
      logger: eventLogger
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
      logger: eventLogger
    });

    return await ScraperService.init({
      db,
      logger: eventLogger,
      taskRepo,
      courseRepo,
      assetRepo,
      pathRepo,
      browserProvider,
      namingService: new AssetNamingService(),
      assetPathResolver,
      authSessionStorage,
      authValidator: new OracleAuthValidator(),
      createInterceptedRepo,
      urlProvider: new OraclePlatformUrlProvider(),
      universalFs,
      nodePath
    });
  }

  async validateAuth() {
    return await this.validateAuthUseCase.execute();
  }

  async getSessionExpiry() {
    const cookies = await this.deps.authSessionStorage.getCookies();
    return this.deps.authValidator.getExpiry(cookies);
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

  resolveCourseId(url: string): string {
    return this.deps.urlProvider.resolveCourseUrl(url).courseId;
  }

  resolvePathId(url: string): string {
    return this.deps.urlProvider.resolveLearningPathUrl(url).pathId;
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

  private async ensureTaskExists(input: CreateTaskInput) {
    const task = await this.deps.taskRepo.findById(input.id);
    if (!task) {
      this.deps.logger.info(`Tarea "${input.id}" no encontrada en el repositorio. Registrándola ahora...`);
      await this.createTask(input);
    }
  }

  async cancelTask(id: string) {
    return this.cancelTaskUseCase.execute({ id });
  }

  async startTask(id: string) {
    const task = await this.deps.taskRepo.findById(id);
    if (!task) {
      throw new Error(`Tarea con ID ${id} no encontrada`);
    }

    this.deps.logger.info(`Iniciando/Reintentando tarea ${id} (${task.action})...`);

    switch (task.action) {
      case ScraperTaskAction.SYNC_COURSE:
        await this.syncCourse({ url: task.url, taskId: id });
        if (task.metadata?.includeDownload !== false && task.metadata?.download) {
          const { courseId } = this.deps.urlProvider.resolveCourseUrl(task.url);
          return this.download({
            download: task.metadata.download,
            taskId: id,
            entityId: courseId,
            entityType: ScraperTaskCategory.COURSE
          });
        }
        return;
      case ScraperTaskAction.SYNC_PATH:
        await this.syncPath({ url: task.url, taskId: id });
        if (task.metadata?.includeDownload !== false && task.metadata?.download) {
          const { pathId } = this.deps.urlProvider.resolveLearningPathUrl(task.url);
          return this.download({
            download: task.metadata.download,
            taskId: id,
            entityId: pathId,
            entityType: ScraperTaskCategory.PATH
          });
        }
        return;
      case ScraperTaskAction.DOWNLOAD_COURSE:
        return this.download({
          download: task.metadata?.download || task.metadata?.type || DownloadType.ALL,
          taskId: id,
          entityId: task.targetId!,
          entityType: ScraperTaskCategory.COURSE
        });
      case ScraperTaskAction.DOWNLOAD_PATH:
        return this.download({
          download: task.metadata?.download || task.metadata?.type || DownloadType.ALL,
          taskId: id,
          entityId: task.targetId!,
          entityType: ScraperTaskCategory.PATH
        });
      default:
        // Por si acaso es una tarea antigua sin acción
        return await this.startTaskUseCase.execute({ id });
    }
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

    const { courseId } = this.deps.urlProvider.resolveCourseUrl(url);
    await this.ensureTaskExists({ id: taskId, type: ScraperTaskCategory.COURSE, action: ScraperTaskAction.SYNC_COURSE, url, targetId: courseId });

    await this.orchestrator.run({ taskId, mainStep: 'Sincronizando curso', onCleanup: () => this.cleanup() }, async (signal) => {
      await syncCourse.execute({ courseInput: url, taskId }, signal);
    });
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

    const { pathId } = this.deps.urlProvider.resolveLearningPathUrl(url);
    await this.ensureTaskExists({ id: taskId, type: ScraperTaskCategory.PATH, action: ScraperTaskAction.SYNC_PATH, url, targetId: pathId });

    await this.orchestrator.run({ taskId, mainStep: 'Sincronizando ruta de aprendizaje', onCleanup: () => this.cleanup() }, async (signal) => {
      await syncPath.execute({ pathInput: url, taskId }, signal);
    });
  }

  async download({ download, taskId, entityId, entityType }: {
    download: DownloadType;
    taskId: string;
    entityId: string;
    entityType: ScraperTaskCategory
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

    const entityUrl = entityType === ScraperTaskCategory.PATH
      ? this.deps.urlProvider.getLearningPathUrl({ id: entityId })
      : this.deps.urlProvider.getCourseUrl({ id: entityId });

    await this.ensureTaskExists({
      id: taskId,
      type: entityType,
      action: entityType === ScraperTaskCategory.PATH ? ScraperTaskAction.DOWNLOAD_PATH : ScraperTaskAction.DOWNLOAD_COURSE,
      url: entityUrl,
      targetId: entityId,
      metadata: { type: download }
    });
    await this.orchestrator.run(
      { taskId, mainStep: 'Descargando recursos...', onCleanup: () => this.cleanup() },
      async (signal) => {
        if (entityType === ScraperTaskCategory.PATH) {
          await downloadPath.execute({ pathInput: entityId, type: download, taskId }, signal);
        } else {
          await downloadCourse.execute({ courseInput: entityId, type: download, taskId }, signal);
        }
      }
    );
  }

  async cleanup() {
    // Intentionally left empty. 
    // Tasks are responsible for closing their own contexts inside finally blocks.
  }
}
