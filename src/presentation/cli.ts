import dotenv from 'dotenv';
import { env } from '../config/env';
import { browserProvider } from '../infrastructure/browser/BrowserProvider';
import { SQLiteCourseRepository } from '../infrastructure/database/CourseRepository';
import { SQLiteAssetRepository } from '../infrastructure/database/AssetRepository';
import { SQLiteLearningPathRepository } from '../infrastructure/database/LearningPathRepository';

import { AuthSession } from '../application/use-cases/AuthSession';
import { SyncCourseData } from '../application/use-cases/SyncCourseData';
import { SyncLearningPath } from '../application/use-cases/SyncLearningPath';
import { DownloadGuides } from '../application/use-cases/DownloadGuides';
import { DownloadVideos } from '../application/use-cases/DownloadVideos';
import { DownloadPath } from '../application/use-cases/DownloadPath';

import { DiskInterceptedDataRepository } from '../infrastructure/repositories/DiskInterceptedDataRepository';
import { DiskAuthSessionStorage } from '../infrastructure/repositories/DiskAuthSessionStorage';
import { DiskAssetStorage } from '../infrastructure/repositories/DiskAssetStorage';
import { YtDlpVideoDownloader } from '../infrastructure/services/YtDlpVideoDownloader';
import { ConsoleLogger } from '../infrastructure/services/ConsoleLogger';
import { DownloadCourse } from '../application/use-cases/DownloadCourse';
import { DownloadType } from '../domain/models/DownloadType';

dotenv.config();

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command) {
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
  const courseRepo = new SQLiteCourseRepository();
  const assetRepo = new SQLiteAssetRepository();
  const pathRepo = new SQLiteLearningPathRepository();

  const interceptedDataRepo = new DiskInterceptedDataRepository();
  const authSessionStorage = new DiskAuthSessionStorage();
  const assetStorage = new DiskAssetStorage();
  const videoDownloader = new YtDlpVideoDownloader(authSessionStorage);

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
        
        const syncCourse = new SyncCourseData({ 
          browserProvider, 
          courseRepository: courseRepo, 
          assetRepository: assetRepo, 
          interceptedDataRepo,
          logger,
        });
        await syncCourse.execute(target);
        break;
      }
      case 'sync-path': {
        const target = args[1];
        if (!target) throw new Error("Falta la URL o ID numérico del Learning Path.");
        
        let pathUrl = target;
        if (/^\d+$/.test(target)) {
           const baseUrl = env.PLATFORM_BASE_URL;
           pathUrl = new URL(`/ou/learning-path/path/${target}`, baseUrl).href;
        }
        
        const syncCourse = new SyncCourseData({ 
          browserProvider, 
          courseRepository: courseRepo, 
          assetRepository: assetRepo, 
          interceptedDataRepo,
          logger,
        });
        const syncPath = new SyncLearningPath({ 
          browserProvider, 
          learningPathRepo: pathRepo, 
          courseRepo, 
          syncCourseData: syncCourse, 
          interceptedDataRepo,
          logger,
        });
        await syncPath.execute(pathUrl);
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
          courseRepo, 
          assetRepo, 
          assetStorage, 
          videoDownloader,
          logger,
        });
        await videos.executeForCourse(id);
        break;
      }
      case 'download-path': {
        const id = args[1];
        const type = args[2] as DownloadType | undefined;
        if (!id) throw new Error("Falta el ID del Learning Path.");

        const guides = new DownloadGuides({ 
          browserProvider,
          courseRepo,
          assetRepo,
          assetStorage,
          logger,
        });
        const videos = new DownloadVideos({ 
          browserProvider,
          courseRepo,
          assetRepo,
          assetStorage,
          videoDownloader,
          logger,
        });
        const downloadPath = new DownloadPath({ 
          learningPathRepo: pathRepo, 
          downloadGuides: guides, 
          downloadVideos: videos,
          logger,
        });

        await downloadPath.execute(id, type || 'all');
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
          logger,
        });
        const videos = new DownloadVideos({
          browserProvider,
          courseRepo,
          assetRepo,
          assetStorage,
          videoDownloader,
          logger,
        });
        
        const downloadCourse = new DownloadCourse({ 
          courseRepo,
          downloadGuides: guides, 
          downloadVideos: videos,
          logger,
        });

        await downloadCourse.execute(id, type || 'all');
        break;
      }
      default:
        console.log(`Comando no reconocido: ${command}`);
    }
  } catch (error) {
    logger.error("Error ejecutando comando:", error, "CLI");
  } finally {
    await browserProvider.close();
  }
}

main().catch(console.error);
