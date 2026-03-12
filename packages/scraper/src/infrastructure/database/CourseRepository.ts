import { Course } from '@domain/models/Course';
import { Asset } from '@domain/models/Asset';
import { ICourseRepository } from '@domain/repositories/ICourseRepository';
import { IDatabase } from './IDatabase';

export class SQLiteCourseRepository implements ICourseRepository {
  constructor(private db: IDatabase) {}

  saveCourse(course: Course): void {
    this.db.prepare(`
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
    const row = this.db.prepare('SELECT id, slug, title FROM Courses WHERE id = ?').get(id) as Course | undefined;
    return row || null;
  }

  getCourseAssets(courseId: string): Asset[] {
    const rows = this.db.prepare('SELECT * FROM Course_Assets WHERE course_id = ?').all(courseId) as any[];
    return rows.map(row => ({
      id: row.id,
      courseId: row.course_id,
      type: row.type,
      url: row.url,
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
      status: row.status,
      localPath: row.local_path
    }));
  }
}
