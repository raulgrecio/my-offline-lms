import { DownloadType, ILogger } from "@my-offline-lms/core";

import { INamingService } from "@features/asset-download/domain/ports/INamingService";
import { ICourseRepository } from "@features/platform-sync/domain/ports/ICourseRepository";

import { DownloadGuides } from "./DownloadGuides";
import { DownloadVideos } from "./DownloadVideos";


export class DownloadCourse {
  private courseRepo: ICourseRepository;
  private downloadGuides: DownloadGuides;
  private downloadVideos: DownloadVideos;
  private namingService: INamingService;
  private logger: ILogger;

  constructor(deps: {
    courseRepo: ICourseRepository,
    downloadGuides: DownloadGuides,
    downloadVideos: DownloadVideos,
    namingService: INamingService,
    logger: ILogger
  }) {
    this.courseRepo = deps.courseRepo;
    this.downloadGuides = deps.downloadGuides;
    this.downloadVideos = deps.downloadVideos;
    this.namingService = deps.namingService;
    this.logger = deps.logger.withContext("DownloadCourse");
  }

  async execute({ courseInput, type = 'all' }: { courseInput: string, type: DownloadType }): Promise<void> {
    const courseId = this.namingService.extractIdFromInput(courseInput);

    this.logger.info(`🚀 Iniciando descarga para curso: ${courseId}`);

    const course = this.courseRepo.getCourseById(courseId);

    if (!course) {
      this.logger.info(`⚠️ No se encontró el curso con ID ${courseId}.`);
      return;
    }

    this.logger.info(`======================================================`, "");
    this.logger.info(`📦 Procesando Curso [${course.id}]: ${course.title}`);
    this.logger.info(`======================================================`, "");


    if (type === 'guide' || type === 'all') {
      await this.downloadGuides.executeForCourse(course.id);
    }

    if (type === 'video' || type === 'all') {
      await this.downloadVideos.executeForCourse(course.id);
    }

    this.logger.info(`======================================================`, "");
    this.logger.info(`🎉 ¡Descarga del curso ${courseId} COMPLETADA!`);
    this.logger.info(`======================================================`, "");
  }
}
