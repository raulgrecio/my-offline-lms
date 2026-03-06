import { ICourseRepository } from "../../domain/repositories/ICourseRepository";
import { DownloadGuides } from "./DownloadGuides";
import { DownloadVideos } from "./DownloadVideos";
import { ILogger } from "../../domain/services/ILogger";
import { DownloadType } from "../../domain/models/DownloadType";


export class DownloadCourse {
  private courseRepo: ICourseRepository;
  private downloadGuides: DownloadGuides;
  private downloadVideos: DownloadVideos;
  private logger: ILogger;

  constructor(deps: {
    courseRepo: ICourseRepository,
    downloadGuides: DownloadGuides,
    downloadVideos: DownloadVideos,
    logger: ILogger
  }) {
    this.courseRepo = deps.courseRepo;
    this.downloadGuides = deps.downloadGuides;
    this.downloadVideos = deps.downloadVideos;
    this.logger = deps.logger.withContext("DownloadCourse");
  }

  async execute(courseId: string, type: DownloadType = 'all'): Promise<void> {
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
