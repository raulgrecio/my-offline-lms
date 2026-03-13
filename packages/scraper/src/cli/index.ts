import dotenv from 'dotenv';
import { env } from '@config/env';

import { AssetNamingService } from '@features/asset-download/infrastructure/AssetNamingService';
import { DownloadType } from '@features/asset-download/domain/models/DownloadType';

import { browserProvider } from '@platform/browser/BrowserProvider';
import { SQLiteCourseRepository } from '@features/platform-sync/infrastructure/CourseRepository';
import { SQLiteAssetRepository } from '@features/asset-download/infrastructure/AssetRepository';
import { SQLiteLearningPathRepository } from '@features/platform-sync/infrastructure/LearningPathRepository';
import { DiskInterceptedDataRepositoryFactory } from '@features/platform-sync/infrastructure/DiskInterceptedDataRepositoryFactory';
import { DiskAuthSessionStorage } from '@features/auth-session/infrastructure/DiskAuthSessionStorage';
import { DiskAssetStorage } from '@features/asset-download/infrastructure/DiskAssetStorage';
import { YtDlpVideoDownloader } from '@features/asset-download/infrastructure/YtDlpVideoDownloader';
import { ConsoleLogger } from '@platform/logging/ConsoleLogger';
import { OraclePlatformUrlProvider } from '@features/platform-sync/infrastructure/OraclePlatformUrlProvider';
import { IDatabase } from '@platform/database/IDatabase';

import { DownloadCourse } from '@features/asset-download/application/DownloadCourse';
import { AuthSession } from '@features/auth-session/application/AuthSession';
import { SyncCourse } from '@features/platform-sync/application/SyncCourse';
import { SyncLearningPath } from '@features/platform-sync/application/SyncLearningPath';
import { DownloadGuides } from '@features/asset-download/application/DownloadGuides';
import { DownloadVideos } from '@features/asset-download/application/DownloadVideos';
import { DownloadPath } from '@features/asset-download/application/DownloadPath';

dotenv.config();

export async function runCLI(db: IDatabase) {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === '--help' || command === '-h') {
    console.log(`
Uso: pnpm cli <comando> [argumentos]

Comandos disponibles:
  login                      Inicia sesión interactiva en la plataforma.
  sync-course <url/path>     Rashea y guarda metadatos de un solo curso.
  sync-path <url/path>       Rashea y guarda metadatos de un Learning Path entero.
  download-course <id>       Descarga todos los vídeos y guías pendientes de un curso.
  download-guides <id>       Descarga solo las guías pendientes de un curso.
  download-videos <id>       Descarga solo los vídeos pendientes de un curso.
  download-path <id> [type]  Descarga un Learning Path entero. type opcional: "video", "guide" o "all".
    `);
    process.exit(0);
  }

  // DI Setup (Manual Instantiation)
  const logger = new ConsoleLogger();
  const courseRepo = new SQLiteCourseRepository(db);
  const assetRepo = new SQLiteAssetRepository(db);
  const pathRepo = new SQLiteLearningPathRepository(db);

  const interceptedDataRepoFactory = new DiskInterceptedDataRepositoryFactory(logger);
  const authSessionStorage = new DiskAuthSessionStorage();
  const assetStorage = new DiskAssetStorage();
  const videoDownloader = new YtDlpVideoDownloader(authSessionStorage);
  const urlProvider = new OraclePlatformUrlProvider();
  const namingService = new AssetNamingService();

  try {
    switch (command) {
      case 'login': {
        const baseUrl = env.PLATFORM_BASE_URL;
        const auth = new AuthSession({
          browserProvider,
          authStorage: authSessionStorage,
          logger,
        });
        await auth.interactiveLogin(baseUrl);
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
          urlProvider,
          namingService,
          logger,
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
          urlProvider,
          namingService,
          logger,
        });
        const syncPath = new SyncLearningPath({
          browserProvider,
          learningPathRepo: pathRepo,
          courseRepo,
          syncCourse,
          interceptedDataRepoFactory,
          urlProvider,
          namingService,
          logger,
        });
        await syncPath.execute(target);
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
        });
        await guides.executeForCourse(id);
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
        });
        await videos.executeForCourse(id);
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
          urlProvider,
          namingService,
          logger,
        });
        const syncPath = new SyncLearningPath({
          browserProvider,
          learningPathRepo: pathRepo,
          courseRepo,
          syncCourse,
          interceptedDataRepoFactory,
          urlProvider,
          namingService,
          logger,
        });
        const guides = new DownloadGuides({
          browserProvider,
          courseRepo,
          assetRepo,
          assetStorage,
          namingService,
          urlProvider,
          logger,
        });
        const videos = new DownloadVideos({
          browserProvider,
          courseRepository: courseRepo,
          assetRepository: assetRepo,
          assetStorage,
          videoDownloader,
          namingService,
          logger,
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
        });
        const videos = new DownloadVideos({
          browserProvider,
          courseRepository: courseRepo,
          assetRepository: assetRepo,
          assetStorage,
          videoDownloader,
          namingService,
          logger,
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
        console.log(`Comando desconocido: ${command}`);
    }
  } catch (err: any) {
    logger.error("Error ejecutando comando:", err.message);
  } finally {
    await browserProvider.close();
  }
}
