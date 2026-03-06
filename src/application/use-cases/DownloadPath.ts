import { ILearningPathRepository } from "../../domain/repositories/ILearningPathRepository";
import { DownloadGuides } from "./DownloadGuides";
import { DownloadVideos } from "./DownloadVideos";
import { ILogger } from "../../domain/services/ILogger";
import { DownloadType } from "../../domain/models/DownloadType";

export class DownloadPath {
  private learningPathRepo: ILearningPathRepository;
  private downloadGuides: DownloadGuides;
  private downloadVideos: DownloadVideos;
  private logger: ILogger;

  constructor(deps: {
    learningPathRepo: ILearningPathRepository,
    downloadGuides: DownloadGuides,
    downloadVideos: DownloadVideos,
    logger: ILogger
  }) {
    this.learningPathRepo = deps.learningPathRepo;
    this.downloadGuides = deps.downloadGuides;
    this.downloadVideos = deps.downloadVideos;
    this.logger = deps.logger.withContext("DownloadPath");
  }

  async execute(pathId: string, type: DownloadType = 'all'): Promise<void> {
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
