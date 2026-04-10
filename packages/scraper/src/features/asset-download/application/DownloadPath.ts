import { DownloadType } from '@core/domain';
import { type ILogger } from '@core/logging';

import { type IUseCase } from '@scraper/features/shared';
import { type ILearningPathRepository, SyncLearningPath } from "@scraper/features/platform-sync";

import { type INamingService } from "../domain/ports/INamingService";
import { DownloadGuides } from "./DownloadGuides";
import { DownloadVideos } from "./DownloadVideos";

export interface DownloadPathInput {
  pathInput: string;
  type: DownloadType;
  taskId?: string;
}

export interface DownloadPathOptions {
  learningPathRepo: ILearningPathRepository;
  syncLearningPath?: SyncLearningPath;
  downloadGuides: DownloadGuides;
  downloadVideos: DownloadVideos;
  namingService: INamingService;
  logger: ILogger;
}

export class DownloadPath implements IUseCase<DownloadPathInput, void> {
  private learningPathRepo: ILearningPathRepository;
  private syncLearningPath?: SyncLearningPath;
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

  async execute(input: DownloadPathInput, signal?: AbortSignal): Promise<void> {
    const { pathInput, type = DownloadType.ALL } = input;
    const pathId = this.namingService.extractIdFromInput(pathInput);

    this.logger.info(`🚀 Iniciando descarga para Learning Path: ${pathId}`);

    const courses = this.learningPathRepo.getCoursesForPath(pathId);

    if (courses.length === 0) {
      this.logger.info(`⚠️ No se encontraron cursos asociados al path ${pathId}.`);
      return;
    }

    this.logger.info(`📚 Encontrados ${courses.length} cursos. Procesando tipo de descarga: ${type}...`);

    for (const course of courses) {
      if (signal?.aborted) return;

      this.logger.info(`======================================================`);
      this.logger.info(`📦 Procesando Curso [${course.orderIndex}/${courses.length}]: ${course.title} (ID: ${course.id})`);
      this.logger.info(`======================================================`);

      if (type === 'guide' || type === 'all') {
        await this.downloadGuides.execute({ courseId: course.id, taskId: input.taskId }, signal);
      }

      if (type === 'video' || type === 'all') {
        await this.downloadVideos.execute({ courseId: course.id, taskId: input.taskId }, signal);
      }
    }

    if (signal?.aborted) {
      this.logger.warn(`======================================================`);
      this.logger.warn(`🛑 Descarga del Learning Path ${pathId} CANCELADA.`);
      this.logger.warn(`======================================================`);
      return;
    }

    this.logger.info(`======================================================`);
    this.logger.info(`🎉 ¡Descarga del Learning Path ${pathId} COMPLETADA!`);
    this.logger.info(`======================================================`);
  }
}
