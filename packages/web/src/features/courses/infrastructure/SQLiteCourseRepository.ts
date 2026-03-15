import { type Course, type Asset, type IDatabase } from "@my-offline-lms/core";
import type { ICourseRepository } from "../domain/ports/ICourseRepository";

export class SQLiteCourseRepository implements ICourseRepository {
  constructor(private db: IDatabase) {}

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

  getCourseAssets(courseId: string): Asset[] {
    const rows = this.db
      .prepare("SELECT * FROM Course_Assets WHERE course_id = ?")
      .all(courseId) as any[];
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
}
