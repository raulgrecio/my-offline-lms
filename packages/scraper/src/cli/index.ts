import { env } from '@config/env';
import { getAssetPathsConfig, getMonorepoRoot, getAuthState, getAuthDir, getInterceptedDir, getDataDir } from '@config/paths';
import dotenv from 'dotenv';

import { ConsoleLogger } from '@my-offline-lms/core/logging';
import { DownloadType } from '@my-offline-lms/core/models';
import { PLATFORM } from '@config/platform';
import { IDatabase } from '@my-offline-lms/core/database';
import { NodeFileSystem, NodePath, UniversalFileSystem, HttpFileSystem, AssetPathResolver } from '@my-offline-lms/core/filesystem';

import { AssetNamingService } from '@features/asset-download/infrastructure/AssetNamingService';
import { SQLiteAssetRepository } from '@features/asset-download/infrastructure/AssetRepository';
import { DiskAssetStorage } from '@features/asset-download/infrastructure/DiskAssetStorage';
import { YtDlpVideoDownloader } from '@features/asset-download/infrastructure/YtDlpVideoDownloader';
import { DiskAuthSessionStorage } from '@features/auth-session/infrastructure/DiskAuthSessionStorage';
import { SQLiteCourseRepository } from '@features/platform-sync/infrastructure/CourseRepository';
import { DiskInterceptedDataRepositoryFactory } from '@features/platform-sync/infrastructure/DiskInterceptedDataRepositoryFactory';
import { SQLiteLearningPathRepository } from '@features/platform-sync/infrastructure/LearningPathRepository';
import { OraclePlatformUrlProvider } from '@features/platform-sync/infrastructure/OraclePlatformUrlProvider';

import { DownloadCourse } from '@features/asset-download/application/DownloadCourse';
import { DownloadGuides } from '@features/asset-download/application/DownloadGuides';
import { DownloadPath } from '@features/asset-download/application/DownloadPath';
import { DownloadVideos } from '@features/asset-download/application/DownloadVideos';
import { AuthSession } from '@features/auth-session/application/AuthSession';
import { SyncCourse } from '@features/platform-sync/application/SyncCourse';
import { SyncLearningPath } from '@features/platform-sync/application/SyncLearningPath';
import { ValidateAuthSession } from '@features/auth-session/application/ValidateAuthSession';
import { BrowserProvider } from '@platform/browser/BrowserProvider';
import { BrowserInterceptor } from '@platform/browser/BrowserInterceptor';

dotenv.config();

export async function runCLI(existingDb: IDatabase) {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === '--help' || command === '-h') {
    const helpMessage = `
Uso: pnpm cli <comando> [argumentos]

Comandos disponibles:
  login                      Inicia sesión interactiva en la plataforma.
  sync-course <url/path>     Rashea y guarda metadatos de un solo curso.
  sync-path <url/path>       Rashea y guarda metadatos de un Learning Path entero.
  download-course <id>       Descarga todos los vídeos y guías pendientes de un curso.
  download-guides <id>       Descarga solo las guías pendientes de un curso.
  download-videos <id>       Descarga solo los vídeos pendientes de un curso.
  download-path <id> [type]  Descarga un Learning Path entero. type opcional: "video", "guide" o "all".
    `;
    console.log(helpMessage);
    process.exit(0);
  }

  // Core Dependencies
  const logger = new ConsoleLogger();
  const nodeFs = new NodeFileSystem(logger);
  const nodePath = new NodePath();
  const universalFs = new UniversalFileSystem(nodeFs, logger);
  universalFs.registerRemote('http', new HttpFileSystem());

  // Database Initialization
  const db = existingDb;

  // Repository Setup
  const courseRepo = new SQLiteCourseRepository(db);
  const assetRepo = new SQLiteAssetRepository(db);
  const pathRepo = new SQLiteLearningPathRepository(db);

  // Platform Services
  const browserProvider = new BrowserProvider({
    fs: universalFs,
    path: nodePath,
    config: {
      chromeExecutablePath: env.CHROME_EXECUTABLE_PATH,
      authStateFile: await getAuthState(),
    },
    logger
  });

  const interceptedDataRepoFactory = new DiskInterceptedDataRepositoryFactory(universalFs, nodePath, logger);
  const authSessionStorage = new DiskAuthSessionStorage({
    fs: universalFs,
    path: nodePath,
    getAuthDir,
  });
  const browserInterceptor = new BrowserInterceptor({
    fs: universalFs,
    path: nodePath,
    logger,
    getInterceptedDir
  });

  const assetPathResolver = new AssetPathResolver({
    configPath: await getAssetPathsConfig(),
    monorepoRoot: await getMonorepoRoot(),
    fs: universalFs,
    path: nodePath,
    logger,
  });
  const assetStorage = new DiskAssetStorage({ fs: universalFs, path: nodePath, resolver: assetPathResolver });
  const videoDownloader = new YtDlpVideoDownloader({ authSessionStorage, logger });
  const urlProvider = new OraclePlatformUrlProvider();
  const namingService = new AssetNamingService();
  const validateAuthSession = new ValidateAuthSession({ authStorage: authSessionStorage, logger });
 
  try {
    // Validar sesión proactivamente para comandos que la requieran
    const publicCommands = ['login', 'help'];
    if (command && !publicCommands.includes(command)) {
      if (!(await validateAuthSession.execute())) {
        return; 
      }
    }

    switch (command) {
      case 'login': {
        const baseUrl = env.PLATFORM_BASE_URL;
        const auth = new AuthSession({
          browserProvider,
          authStorage: authSessionStorage,
          logger,
        });
        await auth.execute({ baseUrl });
        break;
      }
      case 'sync-course': {
        const target = args[1];
        if (!target) throw new Error("Falta la URL del curso.");

        const syncCourse = new SyncCourse({
          browserProvider,
          courseRepository: courseRepo,
          assetRepository: assetRepo,
          interceptedDataRepoFactory,
          browserInterceptor,
          urlProvider,
          namingService,
          logger,
          config: {
            keepTempWorkspaces: env.KEEP_TEMP_WORKSPACES,
            selectors: {
              guidesTab: PLATFORM.SELECTORS.COURSE.GUIDES_TAB
            },
            oracleConstants: {
              videoTypeId: PLATFORM.CONSTANTS.ORACLE.VIDEO_TYPE_ID
            }
          }
        });
        await syncCourse.execute({ courseInput: target });
        break;
      }
      case 'sync-path': {
        const target = args[1];
        if (!target) throw new Error("Falta la URL o ID numérico del Learning Path.");

        const syncCourse = new SyncCourse({
          browserProvider,
          courseRepository: courseRepo,
          assetRepository: assetRepo,
          interceptedDataRepoFactory,
          browserInterceptor,
          urlProvider,
          namingService,
          logger,
          config: {
            keepTempWorkspaces: env.KEEP_TEMP_WORKSPACES,
            selectors: {
              guidesTab: PLATFORM.SELECTORS.COURSE.GUIDES_TAB
            },
            oracleConstants: {
              videoTypeId: PLATFORM.CONSTANTS.ORACLE.VIDEO_TYPE_ID
            }
          }
        });
        const syncPath = new SyncLearningPath({
          browserProvider,
          learningPathRepo: pathRepo,
          courseRepo,
          syncCourse,
          interceptedDataRepoFactory,
          browserInterceptor,
          urlProvider,
          namingService,
          logger,
          config: {
            keepTempWorkspaces: env.KEEP_TEMP_WORKSPACES
          }
        });
        await syncPath.execute({ pathInput: target });
        break;
      }
      case 'download-guides': {
        const id = args[1];
        if (!id) throw new Error("Falta el ID del curso.");

        const guides = new DownloadGuides({
          browserProvider,
          courseRepo,
          assetRepo,
          assetStorage,
          namingService,
          urlProvider,
          logger,
          config: {
            keepTempImages: env.KEEP_TEMP_IMAGES,
            selectors: {
              iframe: PLATFORM.SELECTORS.GUIDE.IFRAME,
              flipbookPages: PLATFORM.SELECTORS.GUIDE.FLIPBOOK_PAGES
            }
          }
        });
        await guides.execute({ courseId: id });
        break;
      }
      case 'download-videos': {
        const id = args[1];
        if (!id) throw new Error("Falta el ID del curso.");

        const videos = new DownloadVideos({
          browserProvider,
          courseRepository: courseRepo,
          assetRepository: assetRepo,
          assetStorage,
          videoDownloader,
          namingService,
          logger,
          config: {
            selectors: {
              video: {
                startBtn: PLATFORM.SELECTORS.VIDEO.START_BTN,
                playBtn: PLATFORM.SELECTORS.VIDEO.PLAY_BTN
              }
            }
          }
        });
        await videos.execute({ courseId: id });
        break;
      }
      case 'download-path': {
        const id = args[1];
        const type = args[2] as DownloadType | undefined;
        if (!id) throw new Error("Falta el ID del Learning Path.");

        const syncCourse = new SyncCourse({
          browserProvider,
          courseRepository: courseRepo,
          assetRepository: assetRepo,
          interceptedDataRepoFactory,
          browserInterceptor,
          urlProvider,
          namingService,
          logger,
          config: {
            keepTempWorkspaces: env.KEEP_TEMP_WORKSPACES,
            selectors: {
              guidesTab: PLATFORM.SELECTORS.COURSE.GUIDES_TAB
            },
            oracleConstants: {
              videoTypeId: PLATFORM.CONSTANTS.ORACLE.VIDEO_TYPE_ID
            }
          }
        });
        const syncPath = new SyncLearningPath({
          browserProvider,
          learningPathRepo: pathRepo,
          courseRepo,
          syncCourse,
          interceptedDataRepoFactory,
          browserInterceptor,
          urlProvider,
          namingService,
          logger,
          config: {
            keepTempWorkspaces: env.KEEP_TEMP_WORKSPACES
          }
        });
        const guides = new DownloadGuides({
          browserProvider,
          courseRepo,
          assetRepo,
          assetStorage,
          namingService,
          urlProvider,
          logger,
          config: {
            keepTempImages: env.KEEP_TEMP_IMAGES,
            selectors: {
              iframe: PLATFORM.SELECTORS.GUIDE.IFRAME,
              flipbookPages: PLATFORM.SELECTORS.GUIDE.FLIPBOOK_PAGES
            }
          }
        });
        const videos = new DownloadVideos({
          browserProvider,
          courseRepository: courseRepo,
          assetRepository: assetRepo,
          assetStorage,
          videoDownloader,
          namingService,
          logger,
          config: {
            selectors: {
              video: {
                startBtn: PLATFORM.SELECTORS.VIDEO.START_BTN,
                playBtn: PLATFORM.SELECTORS.VIDEO.PLAY_BTN
              }
            }
          }
        });
        const downloadPath = new DownloadPath({
          learningPathRepo: pathRepo,
          syncLearningPath: syncPath,
          downloadGuides: guides,
          downloadVideos: videos,
          namingService,
          logger,
        });

        await downloadPath.execute({ pathInput: id, type: type || 'all' });
        break;
      }
      case 'download-course': {
        const id = args[1];
        const type = args[2] as DownloadType | undefined;
        if (!id) throw new Error("Falta el ID del curso.");

        const guides = new DownloadGuides({
          browserProvider,
          courseRepo,
          assetRepo,
          assetStorage,
          namingService,
          urlProvider,
          logger,
          config: {
            keepTempImages: env.KEEP_TEMP_IMAGES,
            selectors: {
              iframe: PLATFORM.SELECTORS.GUIDE.IFRAME,
              flipbookPages: PLATFORM.SELECTORS.GUIDE.FLIPBOOK_PAGES
            }
          }
        });
        const videos = new DownloadVideos({
          browserProvider,
          courseRepository: courseRepo,
          assetRepository: assetRepo,
          assetStorage,
          videoDownloader,
          namingService,
          logger,
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
          courseRepo,
          downloadGuides: guides,
          downloadVideos: videos,
          namingService,
          logger,
        });

        await downloadCourse.execute({ courseInput: id, type: type || 'all' });
        break;
      }
      default:
        logger.info(`Comando desconocido: ${command}`);
    }
  } catch (err: any) {
    logger.error("Error ejecutando comando:", err.message);
  } finally {
    await browserProvider.close();
  }
}
