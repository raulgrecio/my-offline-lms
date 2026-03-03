import { ILearningPathRepository } from "../../domain/repositories/ILearningPathRepository";
import { DownloadGuides } from "./DownloadGuides";
import { DownloadVideos } from "./DownloadVideos";

export class DownloadPath {
  constructor(
    private learningPathRepo: ILearningPathRepository,
    private downloadGuides: DownloadGuides,
    private downloadVideos: DownloadVideos
  ) {}

  async execute(pathId: string, type: 'video' | 'guide' | 'all' = 'all'): Promise<void> {
    console.log(`[DownloadPath] 🚀 Iniciando descarga para Learning Path: ${pathId}`);
    
    const courses = this.learningPathRepo.getCoursesForPath(pathId);
    
    if (courses.length === 0) {
      console.log(`[DownloadPath] ⚠️ No se encontraron cursos asociados al path ${pathId}.`);
      return;
    }

    console.log(`[DownloadPath] 📚 Encontrados ${courses.length} cursos. Procesando tipo de descarga: ${type}...`);

    for (const course of courses) {
      console.log(`\n======================================================`);
      console.log(`[DownloadPath] 📦 Procesando Curso [${course.orderIndex}/${courses.length}]: ${course.title} (ID: ${course.id})`);
      console.log(`======================================================\n`);

      if (type === 'guide' || type === 'all') {
        await this.downloadGuides.executeForCourse(course.id);
      }
      
      if (type === 'video' || type === 'all') {
        await this.downloadVideos.executeForCourse(course.id);
      }
    }

    console.log(`\n======================================================`);
    console.log(`[DownloadPath] 🎉 ¡Descarga del Learning Path ${pathId} COMPLETADA!`);
    console.log(`======================================================\n`);
  }
}
