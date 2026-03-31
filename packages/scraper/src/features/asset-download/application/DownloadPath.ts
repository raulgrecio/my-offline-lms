import { type DownloadType } from '@core/domain';
import { type ILogger } from '@core/logging';

import { type IUseCase } from '@scraper/features/shared/domain/ports/IUseCase';
import { type INamingService } from "@scraper/features/asset-download/domain/ports/INamingService";
import { type ILearningPathRepository } from "@scraper/features/platform-sync/domain/ports/ILearningPathRepository";
import { SyncLearningPath } from "@scraper/features/platform-sync/application/SyncLearningPath";

import { DownloadGuides } from "./DownloadGuides";
import { DownloadVideos } from "./DownloadVideos";

export interface DownloadPathInput {
  pathInput: string;
  type: DownloadType;
}

export interface DownloadPathOptions {
  learningPathRepo: ILearningPathRepository;
  syncLearningPath: SyncLearningPath;
  downloadGuides: DownloadGuides;
  downloadVideos: DownloadVideos;
  namingService: INamingService;
  logger: ILogger;
}

export class DownloadPath implements IUseCase<DownloadPathInput, void> {
  private learningPathRepo: ILearningPathRepository;
  private syncLearningPath: SyncLearningPath;
  private downloadGuides: DownloadGuides;
  private downloadVideos: DownloadVideos;
  private namingService: INamingService;
  private logger: ILogger;

  constructor(options: DownloadPathOptions) {
    this.learningPathRepo = options.learningPathRepo;
    this.syncLearningPath = options.syncLearningPath;
    this.downloadGuides = options.downloadGuides;
    this.downloadVideos = options.downloadVideos;
    this.namingService = options.namingService;
    this.logger = options.logger.withContext("DownloadPath");
  }

  async execute(input: DownloadPathInput): Promise<void> {
    const { pathInput, type = 'all' } = input;
    const pathId = this.namingService.extractIdFromInput(pathInput);

    this.logger.info(`🚀 Iniciando descarga para Learning Path: ${pathId}`);

    const courses = this.learningPathRepo.getCoursesForPath(pathId);

    if (courses.length === 0) {
      this.logger.info(`⚠️ No se encontraron cursos asociados al path ${pathId}.`);
      return;
    }

    this.logger.info(`📚 Encontrados ${courses.length} cursos. Procesando tipo de descarga: ${type}...`);

    for (const course of courses) {
      this.logger.info(`======================================================`, "");
      this.logger.info(`📦 Procesando Curso [${course.orderIndex}/${courses.length}]: ${course.title} (ID: ${course.id})`);
      this.logger.info(`======================================================`, "");

      if (type === 'guide' || type === 'all') {
        await this.downloadGuides.execute({ courseId: course.id });
      }

      if (type === 'video' || type === 'all') {
        await this.downloadVideos.execute({ courseId: course.id });
      }
    }

    this.logger.info(`======================================================`, "");
    this.logger.info(`🎉 ¡Descarga del Learning Path ${pathId} COMPLETADA!`);
    this.logger.info(`======================================================`, "");
  }
}
