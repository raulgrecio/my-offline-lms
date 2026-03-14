import { DownloadType, ILogger } from "@my-offline-lms/core";

import { INamingService } from "@features/asset-download/domain/ports/INamingService";
import { ILearningPathRepository } from "@features/platform-sync/domain/ports/ILearningPathRepository";

import { SyncLearningPath } from "@features/platform-sync/application/SyncLearningPath";

import { DownloadGuides } from "./DownloadGuides";
import { DownloadVideos } from "./DownloadVideos";

export class DownloadPath {
  private learningPathRepo: ILearningPathRepository;
  private syncLearningPath: SyncLearningPath;
  private downloadGuides: DownloadGuides;
  private downloadVideos: DownloadVideos;
  private namingService: INamingService;
  private logger: ILogger;

  constructor(deps: {
    learningPathRepo: ILearningPathRepository,
    syncLearningPath: SyncLearningPath,
    downloadGuides: DownloadGuides,
    downloadVideos: DownloadVideos,
    namingService: INamingService,
    logger: ILogger
  }) {
    this.learningPathRepo = deps.learningPathRepo;
    this.syncLearningPath = deps.syncLearningPath;
    this.downloadGuides = deps.downloadGuides;
    this.downloadVideos = deps.downloadVideos;
    this.namingService = deps.namingService;
    this.logger = deps.logger.withContext("DownloadPath");
  }

  async execute({ pathInput, type = 'all' }: { pathInput: string, type: DownloadType }): Promise<void> {
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
        await this.downloadGuides.executeForCourse(course.id);
      }

      if (type === 'video' || type === 'all') {
        await this.downloadVideos.executeForCourse(course.id);
      }
    }

    this.logger.info(`======================================================`, "");
    this.logger.info(`🎉 ¡Descarga del Learning Path ${pathId} COMPLETADA!`);
    this.logger.info(`======================================================`, "");
  }
}
