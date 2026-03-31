import { type Course, type Asset, type Metadata } from '@core/domain';
import type { IDatabase } from '@core/database';
import type { ICourseRepository } from "../domain/ports/ICourseRepository";

export class SQLiteCourseRepository implements ICourseRepository {
  constructor(private db: IDatabase) { }

  getAllCourses(): Course[] {
    return this.db
      .prepare("SELECT id, slug, title FROM Courses ORDER BY title ASC")
      .all() as Course[];
  }

  getCourseById(id: string): Course | null {
    return (
      (this.db
        .prepare("SELECT id, slug, title FROM Courses WHERE id = ?")
        .get(id) as Course) ?? null
    );
  }

  getAssetsByCourseId(id: string): Asset[] {
    const rows = this.db
      .prepare("SELECT * FROM Course_Assets WHERE course_id = ?")
      .all(id) as any[];
    return rows.map((row) => ({
      id: row.id,
      courseId: row.course_id,
      type: row.type,
      url: row.url,
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
      status: row.status,
      localPath: row.local_path,
    }));
  }

  getAssetById(id: string): Asset | null {
    const row = this.db
      .prepare("SELECT * FROM Course_Assets WHERE id = ?")
      .get(id) as any;
    if (!row) return null;
    return {
      id: row.id,
      courseId: row.course_id,
      type: row.type,
      url: row.url,
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
      status: row.status,
      localPath: row.local_path,
    };
  }

  updateAssetMetadata({ id, metadata }: { id: string, metadata: Metadata }): void {
    const result = this.db
      .prepare("UPDATE Course_Assets SET metadata = ? WHERE id = ?")
      .run(JSON.stringify(metadata), id);

    if (result && result.changes === 0) {
      throw new Error(`Asset with id ${id} not found`);
    }
  }

  getCoursesWithSyncStatus(): any[] {
    return this.db.prepare(`
        SELECT 
            c.id, 
            c.title,
            c.slug,
            (SELECT COUNT(*) FROM Course_Assets WHERE course_id = c.id) as totalAssets,
            (SELECT COUNT(*) FROM Course_Assets WHERE course_id = c.id AND local_path IS NOT NULL) as downloadedAssets,
            (SELECT COUNT(*) FROM Course_Assets WHERE course_id = c.id AND type = '1') as totalVideos,
            (SELECT COUNT(*) FROM Course_Assets WHERE course_id = c.id AND type = '1' AND local_path IS NOT NULL) as downloadedVideos,
            (SELECT COUNT(*) FROM Course_Assets WHERE course_id = c.id AND type = '2') as totalGuides,
            (SELECT COUNT(*) FROM Course_Assets WHERE course_id = c.id AND type = '2' AND local_path IS NOT NULL) as downloadedGuides
        FROM Courses c
        ORDER BY c.title ASC
    `).all();
  }
}
