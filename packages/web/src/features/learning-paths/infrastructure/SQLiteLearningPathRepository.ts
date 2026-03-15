import { type Course, type LearningPath, type IDatabase } from "@my-offline-lms/core";
import type { ILearningPathRepository } from "../domain/ports/ILearningPathRepository";

export class SQLiteLearningPathRepository implements ILearningPathRepository {
  constructor(private db: IDatabase) { }

  getAllLearningPaths(): LearningPath[] {
    return this.db
      .prepare(
        "SELECT id, slug, title, description FROM LearningPaths ORDER BY title ASC",
      )
      .all() as LearningPath[];
  }

  getLearningPathById(id: string): LearningPath | null {
    return (
      (this.db
        .prepare(
          "SELECT id, slug, title, description FROM LearningPaths WHERE id = ?",
        )
        .get(id) as LearningPath) ?? null
    );
  }

  getCoursesForPath(
    pathId: string,
  ): (Course & { orderIndex: number })[] {
    return this.db
      .prepare(
        `
        SELECT c.id, c.slug, c.title, lc.order_index as orderIndex
        FROM LearningPath_Courses lc
        JOIN Courses c ON c.id = lc.course_id
        WHERE lc.path_id = ?
        ORDER BY lc.order_index ASC
      `,
      )
      .all(pathId) as any[];
  }
}
