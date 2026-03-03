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

  // DI Setup
  const courseRepo = new SQLiteCourseRepository();
  const assetRepo = new SQLiteAssetRepository();
  const pathRepo = new SQLiteLearningPathRepository();

  try {
    switch (command) {
      case 'login': {
        const url = env.PLATFORM_BASE_URL;
        const auth = new AuthSession(browserProvider);
        await auth.interactiveLogin(url);
        break;
      }
      case 'sync-course': {
        const target = args[1];
        if (!target) throw new Error("Falta la URL del curso.");
        const sync = new SyncCourseData(browserProvider, courseRepo, assetRepo);
        await sync.execute(target);
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
        
        const syncCourse = new SyncCourseData(browserProvider, courseRepo, assetRepo);
        const syncPath = new SyncLearningPath(browserProvider, pathRepo, courseRepo, syncCourse);
        await syncPath.execute(pathUrl);
        break;
      }
      case 'download-guides': {
        const id = args[1];
        if (!id) throw new Error("Falta el ID del curso.");
        const guides = new DownloadGuides(browserProvider, courseRepo, assetRepo);
        await guides.executeForCourse(id);
        break;
      }
      case 'download-videos': {
        const id = args[1];
        if (!id) throw new Error("Falta el ID del curso.");
        const videos = new DownloadVideos(browserProvider, courseRepo, assetRepo);
        await videos.executeForCourse(id);
        break;
      }
      case 'download-path': {
        const id = args[1];
        const type = args[2] as 'video' | 'guide' | 'all' | undefined;
        if (!id) throw new Error("Falta el ID del Learning Path.");
        const guides = new DownloadGuides(browserProvider, courseRepo, assetRepo);
        const videos = new DownloadVideos(browserProvider, courseRepo, assetRepo);
        const downloadPath = new DownloadPath(pathRepo, guides, videos);
        await downloadPath.execute(id, type || 'all');
        break;
      }
      case 'download-course': {
        const id = args[1];
        if (!id) throw new Error("Falta el ID del curso.");
        const guides = new DownloadGuides(browserProvider, courseRepo, assetRepo);
        const videos = new DownloadVideos(browserProvider, courseRepo, assetRepo);
        
        console.log(`\n=== INICIANDO DESCARGA COMPLETA DEL CURSO ${id} ===\n`);
        await guides.executeForCourse(id);
        await videos.executeForCourse(id);
        console.log(`\n=== DESCARGA COMPLETA FINALIZADA ===\n`);
        break;
      }
      default:
        console.log(`Comando no reconocido: ${command}`);
    }
  } catch (error) {
    console.error("Error ejecutando comando:", error);
  } finally {
    await browserProvider.close();
  }
}

main().catch(console.error);
