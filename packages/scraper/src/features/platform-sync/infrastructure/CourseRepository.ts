import type { Asset, Course } from '@core/domain';
import { type IDatabase } from '@core/database';

import { type ICourseRepository } from '../domain/ports/ICourseRepository';

export class SQLiteCourseRepository implements ICourseRepository {
  constructor(private db: IDatabase) { }

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

  getCoursesWithSyncStatus(): any[] {
    return this.db.prepare(`
        SELECT 
            c.id, 
            c.title,
            c.slug,
            (SELECT COUNT(*) FROM Course_Assets WHERE course_id = c.id) as totalAssets,
            (SELECT COUNT(*) FROM Course_Assets WHERE course_id = c.id AND local_path IS NOT NULL) as downloadedAssets,
            (SELECT COUNT(*) FROM Course_Assets WHERE course_id = c.id AND type = 'video') as totalVideos,
            (SELECT COUNT(*) FROM Course_Assets WHERE course_id = c.id AND type = 'video' AND local_path IS NOT NULL) as downloadedVideos,
            (SELECT COUNT(*) FROM Course_Assets WHERE course_id = c.id AND type = 'guide') as totalGuides,
            (SELECT COUNT(*) FROM Course_Assets WHERE course_id = c.id AND type = 'guide' AND local_path IS NOT NULL) as downloadedGuides
        FROM Courses c
        ORDER BY c.title ASC
    `).all();
  }
}
