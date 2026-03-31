import type { ICourseRepository } from "@web/features/courses/domain/ports/ICourseRepository";
import type { ILearningPathRepository } from "@web/features/learning-paths/domain/ports/ILearningPathRepository";

export class GetAvailableContentToSync {
  constructor(
    private courseRepo: ICourseRepository,
    private pathRepo: ILearningPathRepository
  ) { }

  async execute() {
    const courses = this.courseRepo.getCoursesWithSyncStatus();
    const paths = this.pathRepo.getAllLearningPaths();

    return {
      courses: courses.map(c => ({
        ...c,
        type: 'course',
        url: `https://mylearn.oracle.com/ou/course/${c.slug}/${c.id}`,
        localUrl: `/viewer/course/${c.id}`,
        isComplete: c.totalAssets > 0 && c.totalAssets === c.downloadedAssets
      })),
      paths: paths.map(p => ({
        ...p,
        type: 'path',
        // In the DB LearningPath has url? Let's check LearningPath model
        url: (p as any).url || `https://mylearn.oracle.com/ou/learning-path/${p.slug}/${p.id}`,
        localUrl: `/learning-path/${p.id}`
      }))
    };
  }
}
