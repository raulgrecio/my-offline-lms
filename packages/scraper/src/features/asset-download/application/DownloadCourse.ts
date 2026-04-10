import { DownloadType } from '@core/domain';
import { type ILogger } from '@core/logging';

import { type IUseCase } from '@scraper/features/shared';
import { type ICourseRepository } from "@scraper/features/platform-sync";

import { type INamingService } from "../domain/ports/INamingService";


import { DownloadGuides } from "./DownloadGuides";
import { DownloadVideos } from "./DownloadVideos";

export interface DownloadCourseInput {
  courseInput: string;
  type: DownloadType;
  taskId?: string;
}

export interface DownloadCourseOptions {
  courseRepo: ICourseRepository;
  downloadGuides: DownloadGuides;
  downloadVideos: DownloadVideos;
  namingService: INamingService;
  logger: ILogger;
}

export class DownloadCourse implements IUseCase<DownloadCourseInput, void> {
  private courseRepo: ICourseRepository;
  private downloadGuides: DownloadGuides;
  private downloadVideos: DownloadVideos;
  private namingService: INamingService;
  private logger: ILogger;

  constructor(options: DownloadCourseOptions) {
    this.courseRepo = options.courseRepo;
    this.downloadGuides = options.downloadGuides;
    this.downloadVideos = options.downloadVideos;
    this.namingService = options.namingService;
    this.logger = options.logger.withContext("DownloadCourse");
  }

  async execute(input: DownloadCourseInput, signal?: AbortSignal): Promise<void> {
    const { courseInput, type = DownloadType.ALL } = input;
    const courseId = this.namingService.extractIdFromInput(courseInput);

    this.logger.info(`🚀 Iniciando descarga para curso: ${courseId}`);

    const course = this.courseRepo.getCourseById(courseId);

    if (!course) {
      this.logger.info(`⚠️ No se encontró el curso con ID ${courseId}.`);
      return;
    }

    this.logger.info(`======================================================`);
    this.logger.info(`📦 Procesando Curso [${course.id}]: ${course.title}`);
    this.logger.info(`======================================================`);


    if (type === 'guide' || type === 'all') {
      await this.downloadGuides.execute({ courseId: course.id, taskId: input.taskId }, signal);
    }

    if (type === 'video' || type === 'all') {
      await this.downloadVideos.execute({ courseId: course.id, taskId: input.taskId }, signal);
    }

    if (signal?.aborted) {
      this.logger.warn(`======================================================`);
      this.logger.warn(`🛑 Descarga del curso ${courseId} CANCELADA.`);
      this.logger.warn(`======================================================`);
      return;
    }

    this.logger.info(`======================================================`);
    this.logger.info(`🎉 ¡Descarga del curso ${courseId} COMPLETADA!`);
    this.logger.info(`======================================================`);
  }
}
