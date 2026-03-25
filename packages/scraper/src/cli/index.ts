import { env } from '@config/env';
import { getAssetPathsConfig, getMonorepoRoot, getAuthState, getAuthDir, getInterceptedDir, getDataDir } from '@config/paths';
import dotenv from 'dotenv';

import { ConsoleLogger } from '@my-offline-lms/core/logging';
import { DownloadType } from '@my-offline-lms/core/models';
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

import { PLATFORM } from '@config/platform';
import { BrowserProvider } from '@platform/browser/BrowserProvider';
import { BrowserInterceptor } from '@platform/browser/BrowserInterceptor';

dotenv.config();

const CLI_COMMANDS = {
  LOGIN: 'login',
  SYNC_COURSE: 'sync-course',
  SYNC_PATH: 'sync-path',
  DOWNLOAD_COURSE: 'download-course',
  DOWNLOAD_GUIDES: 'download-guides',
  DOWNLOAD_VIDEOS: 'download-videos',
  DOWNLOAD_PATH: 'download-path'
} as const;

type CliCommand = (typeof CLI_COMMANDS)[keyof typeof CLI_COMMANDS];

interface CommandMetadata {
  command: CliCommand;
  description: string;
  usage: string;
  requiresAuth: boolean;
}

const COMMANDS_METADATA: CommandMetadata[] = [
  {
    command: CLI_COMMANDS.LOGIN,
    description: 'Inicia sesión interactiva en la plataforma.',
    usage: 'login',
    requiresAuth: false,
  },
  {
    command: CLI_COMMANDS.SYNC_COURSE,
    description: 'Rashea y guarda metadatos de un solo curso.',
    usage: 'sync-course <url/path>',
    requiresAuth: true,
  },
  {
    command: CLI_COMMANDS.SYNC_PATH,
    description: 'Rashea y guarda metadatos de un Learning Path entero.',
    usage: 'sync-path <url/path>',
    requiresAuth: true,
  },
  {
    command: CLI_COMMANDS.DOWNLOAD_COURSE,
    description: 'Descarga todos los vídeos y guías pendientes de un curso.',
    usage: 'download-course <id> [type]',
    requiresAuth: true,
  },
  {
    command: CLI_COMMANDS.DOWNLOAD_GUIDES,
    description: 'Descarga solo las guías pendientes de un curso.',
    usage: 'download-guides <id>',
    requiresAuth: true,
  },
  {
    command: CLI_COMMANDS.DOWNLOAD_VIDEOS,
    description: 'Descarga solo los vídeos pendientes de un curso.',
    usage: 'download-videos <id>',
    requiresAuth: true,
  },
  {
    command: CLI_COMMANDS.DOWNLOAD_PATH,
    description: 'Descarga un Learning Path entero. type opcional: "video", "guide" o "all".',
    usage: 'download-path <id> [type]',
    requiresAuth: true,
  },
];

const SHARED_CONFIGS = {
  SYNC_COURSE: {
    keepTempWorkspaces: env.KEEP_TEMP_WORKSPACES,
    selectors: {
      guidesTab: PLATFORM.SELECTORS.COURSE.GUIDES_TAB
    },
    oracleConstants: {
      videoTypeId: PLATFORM.CONSTANTS.ORACLE.VIDEO_TYPE_ID
    }
  },
  SYNC_PATH: {
    keepTempWorkspaces: env.KEEP_TEMP_WORKSPACES
  },
  DOWNLOAD_GUIDES: {
    keepTempImages: env.KEEP_TEMP_IMAGES,
    selectors: {
      iframe: PLATFORM.SELECTORS.GUIDE.IFRAME,
      flipbookPages: PLATFORM.SELECTORS.GUIDE.FLIPBOOK_PAGES
    }
  },
  DOWNLOAD_VIDEOS: {
    selectors: {
      video: {
        startBtn: PLATFORM.SELECTORS.VIDEO.START_BTN,
        playBtn: PLATFORM.SELECTORS.VIDEO.PLAY_BTN
      }
    }
  }
};

function showHelp() {
  console.log(`
Uso: pnpm cli <comando> [argumentos]

Comandos disponibles:
${COMMANDS_METADATA.map((m) => `  ${m.usage.padEnd(26)} ${m.description}`).join('\n')}
  `);
}

import { getDb } from '@platform/database/database';

export async function runCLI() {
  const args = process.argv.slice(2);
  const commandInput = args[0];

  const isHelp = !commandInput || commandInput === '--help' || commandInput === '-h' || commandInput === 'help';
  const metadata = COMMANDS_METADATA.find((m) => m.command === (commandInput as CliCommand));

  if (isHelp || !metadata) {
    if (commandInput && !isHelp) {
      console.error(`Error: Comando "${commandInput}" no reconocido.\n`);
    }
    showHelp();
    return;
  }

  // Core Dependencies - Initialized only if command is valid
  const logger = new ConsoleLogger();
  let db: IDatabase | undefined;
  let browserProvider: BrowserProvider | undefined;

  try {
    const nodeFs = new NodeFileSystem(logger);
    const nodePath = new NodePath();
    const universalFs = new UniversalFileSystem(nodeFs, logger);
    universalFs.registerRemote('http', new HttpFileSystem());

    // Database Initialization
    db = await getDb({ fsAdapter: nodeFs });

    // Repository Setup
    const courseRepo = new SQLiteCourseRepository(db);
    const assetRepo = new SQLiteAssetRepository(db);
    const pathRepo = new SQLiteLearningPathRepository(db);

    // Platform Services
    browserProvider = new BrowserProvider({
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

    // Application Service Factories to avoid repetition
    const createSyncCourse = () => new SyncCourse({
      browserProvider: browserProvider!,
      courseRepository: courseRepo,
      assetRepository: assetRepo,
      interceptedDataRepoFactory,
      browserInterceptor,
      urlProvider,
      namingService,
      logger,
      config: SHARED_CONFIGS.SYNC_COURSE
    });

    const createSyncPath = (syncCourse: SyncCourse) => new SyncLearningPath({
      browserProvider: browserProvider!,
      learningPathRepo: pathRepo,
      courseRepo,
      syncCourse,
      interceptedDataRepoFactory,
      browserInterceptor,
      urlProvider,
      namingService,
      logger,
      config: SHARED_CONFIGS.SYNC_PATH
    });

    const createDownloadGuides = () => new DownloadGuides({
      browserProvider: browserProvider!,
      courseRepo,
      assetRepo,
      assetStorage,
      namingService,
      urlProvider,
      logger,
      config: SHARED_CONFIGS.DOWNLOAD_GUIDES
    });

    const createDownloadVideos = () => new DownloadVideos({
      browserProvider: browserProvider!,
      courseRepository: courseRepo,
      assetRepository: assetRepo,
      assetStorage,
      videoDownloader,
      namingService,
      logger,
      config: SHARED_CONFIGS.DOWNLOAD_VIDEOS
    });

    const createDownloadPath = (syncLearningPath: SyncLearningPath, downloadGuides: DownloadGuides, downloadVideos: DownloadVideos) => new DownloadPath({
      learningPathRepo: pathRepo,
      syncLearningPath,
      downloadGuides,
      downloadVideos,
      namingService,
      logger,
    });

    const createDownloadCourse = (downloadGuides: DownloadGuides, downloadVideos: DownloadVideos) => new DownloadCourse({
      courseRepo,
      downloadGuides,
      downloadVideos,
      namingService,
      logger,
    });

    // Session validation if required by command metadata
    if (metadata.requiresAuth) {
      if (!(await validateAuthSession.execute())) {
        return;
      }
    }

    const command = metadata.command;
    switch (command) {
      case CLI_COMMANDS.LOGIN: {
        const baseUrl = env.PLATFORM_BASE_URL;
        const auth = new AuthSession({
          browserProvider,
          authStorage: authSessionStorage,
          logger,
        });
        await auth.execute({ baseUrl });
        break;
      }
      case CLI_COMMANDS.SYNC_COURSE: {
        const target = args[1];
        if (!target) throw new Error("Falta la URL del curso.");

        const syncCourse = createSyncCourse();
        await syncCourse.execute({ courseInput: target });
        break;
      }
      case CLI_COMMANDS.SYNC_PATH: {
        const target = args[1];
        if (!target) throw new Error("Falta la URL o ID numérico del Learning Path.");

        const syncCourse = createSyncCourse();
        const syncPath = createSyncPath(syncCourse);
        await syncPath.execute({ pathInput: target });
        break;
      }
      case CLI_COMMANDS.DOWNLOAD_GUIDES: {
        const id = args[1];
        if (!id) throw new Error("Falta el ID del curso.");

        const guides = createDownloadGuides();
        await guides.execute({ courseId: id });
        break;
      }
      case CLI_COMMANDS.DOWNLOAD_VIDEOS: {
        const id = args[1];
        if (!id) throw new Error("Falta el ID del curso.");

        const videos = createDownloadVideos();
        await videos.execute({ courseId: id });
        break;
      }
      case CLI_COMMANDS.DOWNLOAD_PATH: {
        const id = args[1];
        const type = args[2] as DownloadType | undefined;
        if (!id) throw new Error("Falta el ID del Learning Path.");

        const syncPath = createSyncPath(createSyncCourse());
        const downloadPath = createDownloadPath(syncPath, createDownloadGuides(), createDownloadVideos());

        await downloadPath.execute({ pathInput: id, type: type || 'all' });
        break;
      }
      case CLI_COMMANDS.DOWNLOAD_COURSE: {
        const id = args[1];
        const type = args[2] as DownloadType | undefined;
        if (!id) throw new Error("Falta el ID del curso.");

        const downloadCourse = createDownloadCourse(createDownloadGuides(), createDownloadVideos());

        await downloadCourse.execute({ courseInput: id, type: type || 'all' });
        break;
      }
    }
  } catch (err: any) {
    logger.error("Error ejecutando comando:", err.message);
  } finally {
    if (browserProvider) {
      await browserProvider.close();
    }
    // Close database
    if (db) {
      db.close();
    }
  }
}
