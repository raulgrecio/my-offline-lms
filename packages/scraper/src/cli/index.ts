import dotenv from 'dotenv';
import { DownloadType, generateId } from '@core/domain';
import { ScraperService } from '../ScraperService';
import { ScraperTaskCategory } from '../features/task-management';

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

function showHelp() {
  console.log(`
Uso: pnpm cli <comando> [argumentos]

Comandos disponibles:
${COMMANDS_METADATA.map((m) => `  ${m.usage.padEnd(26)} ${m.description}`).join('\n')}
  `);
}

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

  try {
    const scraper = await ScraperService.create();

    // Session validation if required by command metadata
    if (metadata.requiresAuth) {
      const isValid = await scraper.validateAuth();
      if (!isValid) {
        console.error("No se ha detectado una sesión válida. Por favor, ejecuta 'pnpm cli login' primero.");
        return;
      }
    }

    const command = metadata.command;
    const taskId = generateId();

    switch (command) {
      case CLI_COMMANDS.LOGIN: {
        await scraper.login({ interactive: true, headless: false });
        break;
      }
      case CLI_COMMANDS.SYNC_COURSE: {
        const target = args[1];
        if (!target) throw new Error("Falta la URL del curso.");
        await scraper.syncCourse({ url: target, taskId: taskId });
        break;
      }
      case CLI_COMMANDS.SYNC_PATH: {
        const target = args[1];
        if (!target) throw new Error("Falta la URL o ID numérico del Learning Path.");
        await scraper.syncPath({ url: target, taskId: taskId });
        break;
      }
      case CLI_COMMANDS.DOWNLOAD_GUIDES: {
        let id = args[1];
        if (!id) throw new Error("Falta el ID del curso.");
        if (id.startsWith('http')) {
          id = scraper.resolveCourseId(id);
        }
        await scraper.download({ download: DownloadType.GUIDE, taskId: taskId, entityId: id, entityType: ScraperTaskCategory.COURSE });
        break;
      }
      case CLI_COMMANDS.DOWNLOAD_VIDEOS: {
        let id = args[1];
        if (!id) throw new Error("Falta el ID del curso.");
        if (id.startsWith('http')) {
          id = scraper.resolveCourseId(id);
        }
        await scraper.download({ download: DownloadType.VIDEO, taskId: taskId, entityId: id, entityType: ScraperTaskCategory.COURSE });
        break;
      }
      case CLI_COMMANDS.DOWNLOAD_PATH: {
        let id = args[1];
        const type = (args[2] as DownloadType) || DownloadType.ALL;
        if (!id) throw new Error("Falta el ID del Learning Path.");
        if (id.startsWith('http')) {
          id = scraper.resolvePathId(id);
        }
        await scraper.download({ download: type, taskId: taskId, entityId: id, entityType: ScraperTaskCategory.PATH });
        break;
      }
      case CLI_COMMANDS.DOWNLOAD_COURSE: {
        let id = args[1];
        const type = (args[2] as DownloadType) || DownloadType.ALL;
        if (!id) throw new Error("Falta el ID del curso.");
        if (id.startsWith('http')) {
          id = scraper.resolveCourseId(id);
        }
        await scraper.download({ download: type, taskId: taskId, entityId: id, entityType: ScraperTaskCategory.COURSE });
        break;
      }
    }
  } catch (err: any) {
    console.error("Error ejecutando comando:", err.message);
  }
}
