import type { Course, LearningPath, LearningPathCourse } from '@core/domain';
import type { IDatabase } from '@core/database';

import { type ILearningPathRepository } from '@scraper/features/platform-sync/domain/ports/ILearningPathRepository';

export class SQLiteLearningPathRepository implements ILearningPathRepository {
  constructor(private db: IDatabase) { }

  saveLearningPath(path: LearningPath): void {
    this.db.prepare(`
        INSERT INTO LearningPaths (id, slug, title, description)
        VALUES (@id, @slug, @title, @description)
        ON CONFLICT(id) DO UPDATE SET 
            title=excluded.title, 
            slug=excluded.slug,
            description=excluded.description
     `).run(path);
  }

  getLearningPathById(id: string): LearningPath | null {
    const row = this.db.prepare('SELECT id, slug, title, description FROM LearningPaths WHERE id = ?').get(id) as LearningPath;
    return row || null;
  }

  getCoursesForPath(pathId: string): (Course & { orderIndex: number })[] {
    return this.db.prepare(`
        SELECT c.id, c.slug, c.title, lc.order_index as orderIndex
        FROM LearningPath_Courses lc
        JOIN Courses c ON c.id = lc.course_id
        WHERE lc.path_id = ?
        ORDER BY lc.order_index ASC
     `).all(pathId) as any[];
  }

  addCourseToPath(link: LearningPathCourse): void {
    this.db.prepare(`
        INSERT INTO LearningPath_Courses (path_id, course_id, order_index)
        VALUES (@pathId, @courseId, @orderIndex)
        ON CONFLICT(path_id, course_id) DO UPDATE SET order_index=excluded.order_index
      `).run({
      pathId: link.pathId,
      courseId: link.courseId,
      orderIndex: link.orderIndex
    });
  }
}
