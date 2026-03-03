import { db } from '../../db/schema';
import { Course } from '../../domain/models/Course';
import { Asset, AssetType } from '../../domain/models/Asset';
import { ICourseRepository } from '../../domain/repositories/ICourseRepository';

export class SQLiteCourseRepository implements ICourseRepository {
  saveCourse(course: Course): void {
    db.prepare(`
        INSERT INTO Courses (id, slug, title)
        VALUES (@id, @slug, @title)
        ON CONFLICT(id) DO UPDATE SET title=excluded.title, slug=excluded.slug
    `).run({
      id: course.id,
      slug: course.slug,
      title: course.title
    });
  }

  getCourseById(id: string): Course | null {
    const row = db.prepare('SELECT id, slug, title FROM Courses WHERE id = ?').get(id) as Course | undefined;
    return row || null;
  }

  getCourseAssets(courseId: string): Asset[] {
    return db.prepare('SELECT * FROM Course_Assets WHERE course_id = ?').all(courseId) as any[];
  }
}
