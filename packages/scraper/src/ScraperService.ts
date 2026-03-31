import { ConsoleLogger } from '@core/logging';
import { type IDatabase } from '@core/database';
import { type DownloadType } from '@core/domain';
import { NodeFileSystem, NodePath, UniversalFileSystem, HttpFileSystem, AssetPathResolver } from '@core/filesystem';

import { env } from './config/env';
import { PLATFORM } from './config/platform';
import { getAssetPathsConfig, getMonorepoRoot, getAuthState, getAuthDir, getInterceptedDir } from './config/paths';
import { AssetNamingService } from './features/asset-download/infrastructure/AssetNamingService';
import { SQLiteAssetRepository } from './features/asset-download/infrastructure/AssetRepository';
import { DiskAssetStorage } from './features/asset-download/infrastructure/DiskAssetStorage';
import { YtDlpVideoDownloader } from './features/asset-download/infrastructure/YtDlpVideoDownloader';
import { DiskAuthSessionStorage } from './features/auth-session/infrastructure/DiskAuthSessionStorage';
import { SQLiteCourseRepository } from './features/platform-sync/infrastructure/CourseRepository';
import { DiskInterceptedDataRepositoryFactory } from './features/platform-sync/infrastructure/DiskInterceptedDataRepositoryFactory';
import { SQLiteLearningPathRepository } from './features/platform-sync/infrastructure/LearningPathRepository';
import { OraclePlatformUrlProvider } from './features/platform-sync/infrastructure/OraclePlatformUrlProvider';
import { DownloadCourse } from './features/asset-download/application/DownloadCourse';
import { DownloadGuides } from './features/asset-download/application/DownloadGuides';
import { DownloadPath } from './features/asset-download/application/DownloadPath';
import { DownloadVideos } from './features/asset-download/application/DownloadVideos';
import { SyncCourse } from './features/platform-sync/application/SyncCourse';
import { AuthSession } from './features/auth-session/application/AuthSession';
import { ValidateAuthSession } from './features/auth-session/application/ValidateAuthSession';
import { SyncLearningPath } from './features/platform-sync/application/SyncLearningPath';
import { BrowserProvider } from './platform/browser/BrowserProvider';
import { BrowserInterceptor } from './platform/browser/BrowserInterceptor';
import { getDb } from './platform/database/database';

export interface ScraperServiceConfig {
  keepTempWorkspaces?: boolean;
}

export class ScraperService {
  private db?: IDatabase;
  private browserProvider?: BrowserProvider;

  async init() {
    const logger = new ConsoleLogger();
    const nodeFs = new NodeFileSystem(logger);
    const nodePath = new NodePath();
    const universalFs = new UniversalFileSystem(nodeFs, logger);
    universalFs.registerRemote('http', new HttpFileSystem());

    this.db = await getDb({ fsAdapter: nodeFs });

    this.browserProvider = new BrowserProvider({
      fs: universalFs,
      path: nodePath,
      config: {
        chromeExecutablePath: env.CHROME_EXECUTABLE_PATH,
        authStateFile: await getAuthState(),
      },
      logger
    });

    return {
      logger,
      nodeFs,
      nodePath,
      universalFs,
      courseRepo: new SQLiteCourseRepository(this.db),
      assetRepo: new SQLiteAssetRepository(this.db),
      pathRepo: new SQLiteLearningPathRepository(this.db),
      browserProvider: this.browserProvider,
      namingService: new AssetNamingService(),
      authSessionStorage: new DiskAuthSessionStorage({
        fs: universalFs,
        path: nodePath,
        getAuthDir,
      }),
      interceptedDataRepoFactory: new DiskInterceptedDataRepositoryFactory(universalFs, nodePath, logger),
      browserInterceptor: new BrowserInterceptor({
        fs: universalFs,
        path: nodePath,
        logger,
        getInterceptedDir
      }),
      assetPathResolver: new AssetPathResolver({
        configPath: await getAssetPathsConfig(),
        monorepoRoot: await getMonorepoRoot(),
        fs: universalFs,
        path: nodePath,
        logger,
      }),
      urlProvider: new OraclePlatformUrlProvider(),
    };
  }

  async syncCourse(url: string) {
    const deps = await this.init();
    const syncCourse = new SyncCourse({
      ...deps,
      courseRepository: deps.courseRepo,
      assetRepository: deps.assetRepo,
      config: {
        keepTempWorkspaces: env.KEEP_TEMP_WORKSPACES,
        selectors: { guidesTab: PLATFORM.SELECTORS.COURSE.GUIDES_TAB },
        oracleConstants: { videoTypeId: PLATFORM.CONSTANTS.ORACLE.VIDEO_TYPE_ID }
      }
    });

    try {
      if (!(await new ValidateAuthSession({ authStorage: deps.authSessionStorage, logger: deps.logger }).execute())) {
        throw new Error("Necesitas iniciar sesión. Ejecuta 'pnpm cli login'.");
      }
      await syncCourse.execute({ courseInput: url });
    } finally {
      await this.cleanup();
    }
  }

  async syncPath(url: string) {
    const deps = await this.init();
    const syncCourse = new SyncCourse({
      ...deps,
      courseRepository: deps.courseRepo,
      assetRepository: deps.assetRepo,
      config: {
        keepTempWorkspaces: env.KEEP_TEMP_WORKSPACES,
        selectors: { guidesTab: PLATFORM.SELECTORS.COURSE.GUIDES_TAB },
        oracleConstants: { videoTypeId: PLATFORM.CONSTANTS.ORACLE.VIDEO_TYPE_ID }
      }
    });

    const syncPath = new SyncLearningPath({
      ...deps,
      learningPathRepo: deps.pathRepo,
      courseRepo: deps.courseRepo,
      syncCourse,
      config: { keepTempWorkspaces: env.KEEP_TEMP_WORKSPACES }
    });

    try {
      if (!(await new ValidateAuthSession({ authStorage: deps.authSessionStorage, logger: deps.logger }).execute())) {
        throw new Error("Necesitas iniciar sesión. Ejecuta 'pnpm cli login'.");
      }
      await syncPath.execute({ pathInput: url });
    } finally {
      await this.cleanup();
    }
  }

  async download(id: string, type: DownloadType = 'all', isPath: boolean = false) {
    const deps = await this.init();
    const assetStorage = new DiskAssetStorage({ 
        fs: deps.universalFs, 
        path: deps.nodePath, 
        resolver: deps.assetPathResolver 
    });
    const videoDownloader = new YtDlpVideoDownloader({ 
        authSessionStorage: deps.authSessionStorage, 
        logger: deps.logger 
    });

    const downloadGuides = new DownloadGuides({
        ...deps,
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
        ...deps,
        courseRepository: deps.courseRepo,
        assetRepository: deps.assetRepo,
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

    try {
      if (!(await new ValidateAuthSession({ authStorage: deps.authSessionStorage, logger: deps.logger }).execute())) {
        throw new Error("Necesitas iniciar sesión. Ejecuta 'pnpm cli login'.");
      }

      if (isPath) {
        const syncCourse = new SyncCourse({
            ...deps,
            courseRepository: deps.courseRepo,
            assetRepository: deps.assetRepo,
            config: {
                keepTempWorkspaces: env.KEEP_TEMP_WORKSPACES,
                selectors: { guidesTab: PLATFORM.SELECTORS.COURSE.GUIDES_TAB },
                oracleConstants: { videoTypeId: PLATFORM.CONSTANTS.ORACLE.VIDEO_TYPE_ID }
            }
        });
        const syncPath = new SyncLearningPath({
            ...deps,
            learningPathRepo: deps.pathRepo,
            courseRepo: deps.courseRepo,
            syncCourse,
            config: { keepTempWorkspaces: env.KEEP_TEMP_WORKSPACES }
        });
        const downloader = new DownloadPath({
            learningPathRepo: deps.pathRepo,
            syncLearningPath: syncPath,
            downloadGuides,
            downloadVideos,
            namingService: deps.namingService,
            logger: deps.logger,
        });
        await downloader.execute({ pathInput: id, type });
      } else {
        const downloader = new DownloadCourse({
            courseRepo: deps.courseRepo,
            downloadGuides,
            downloadVideos,
            namingService: deps.namingService,
            logger: deps.logger,
        });
        await downloader.execute({ courseInput: id, type });
      }
    } finally {
      await this.cleanup();
    }
  }

  private async cleanup() {
    if (this.browserProvider) {
      await this.browserProvider.close();
    }
    if (this.db) {
      this.db.close();
    }
  }
}
