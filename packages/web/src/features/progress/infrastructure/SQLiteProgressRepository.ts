import { type Asset, type IDatabase } from "@my-offline-lms/core";

import type { CourseProgress } from "../domain/model/CourseProgress";
import type { AssetProgress } from "../domain/model/AssetProgress";
import type { LearningPathProgress } from "../domain/model/LearningPathProgress";
import type { ProgressStatus } from "../domain/model/ProgressStatus";
import type { IProgressRepository } from "../domain/ports/IProgressRepository";

export class SQLiteProgressRepository implements IProgressRepository {
  constructor(private db: IDatabase) { }

  getAssetProgress(assetId: string): AssetProgress | null {
    const row = this.db
      .prepare(
        "SELECT asset_id, position, max_position, completed, updated_at FROM UserProgress WHERE asset_id = ?",
      )
      .get(assetId) as any;

    if (!row) return null;
    const currentPos = row.position || 0;
    const maxPos = row.max_position || 0;

    return {
      assetId: row.asset_id,
      position: currentPos,
      maxPosition: Math.max(currentPos, maxPos),
      completed: row.completed === 1,
      updatedAt: row.updated_at,
    };
  }


  getCourseProgress(courseId: string): CourseProgress | null {
    const row = this.db
      .prepare(
        "SELECT course_id, status, completed_assets, in_progress_assets, total_assets, updated_at FROM UserCourseProgress WHERE course_id = ?",
      )
      .get(courseId) as any;
    if (!row) return null;
    return {
      courseId: row.course_id,
      status: row.status as ProgressStatus,
      completedAssets: row.completed_assets || 0,
      inProgressAssets: row.in_progress_assets || 0,
      totalAssets: row.total_assets || 0,
      updatedAt: row.updated_at,
    };
  }

  getLearningPathProgress(pathId: string): LearningPathProgress | null {
    const row = this.db
      .prepare(
        "SELECT path_id, status, completed_courses, in_progress_courses, total_courses, updated_at FROM UserLearningPathProgress WHERE path_id = ?",
      )
      .get(pathId) as any;
    if (!row) return null;
    return {
      pathId: row.path_id,
      status: row.status as ProgressStatus,
      completedCourses: row.completed_courses || 0,
      inProgressCourses: row.in_progress_courses || 0,
      totalCourses: row.total_courses || 0,
      updatedAt: row.updated_at,
    };
  }

  getAllCourseProgress(): CourseProgress[] {
    return (
      this.db
        .prepare("SELECT course_id, status, completed_assets, in_progress_assets, total_assets, updated_at FROM UserCourseProgress")
        .all() as any[]
    ).map((row) => ({
      courseId: row.course_id,
      status: row.status as ProgressStatus,
      completedAssets: row.completed_assets || 0,
      inProgressAssets: row.in_progress_assets || 0,
      totalAssets: row.total_assets || 0,
      updatedAt: row.updated_at,
    }));
  }

  getLastWatchedAsset(): (Asset & { position: number }) | null {
    const row = this.db
      .prepare(
        `
      SELECT ca.*, up.position
      FROM UserProgress up
      JOIN Course_Assets ca ON ca.id = up.asset_id
      WHERE (up.completed = 0 OR up.completed IS NULL) AND ca.type = 'video' AND ca.status = 'COMPLETED'
      ORDER BY up.updated_at DESC
      LIMIT 1
    `,
      )
      .get() as any;
    if (!row) return null;
    return {
      id: row.id,
      courseId: row.course_id,
      type: row.type,
      url: row.url,
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
      status: row.status,
      localPath: row.local_path,
      position: row.position || 0,
    };
  }

  updateVideoProgress({
    assetId,
    position,
    duration,
    completed,
  }: { assetId: string; position: number; duration: number; completed: boolean }): void {
    this.db
      .prepare(
        `
      INSERT INTO UserProgress (asset_id, position, max_position, completed, updated_at)
      VALUES (?, ?, ?, ?, datetime('now'))
      ON CONFLICT(asset_id) DO UPDATE SET
        position     = excluded.position,
        max_position = MAX(max_position, excluded.max_position),
        completed    = MAX(completed, excluded.completed),
        updated_at   = excluded.updated_at
    `,
      )
      .run(assetId, position, duration, completed ? 1 : 0);
  }

  updateGuideProgress({
    assetId,
    position,
    duration,
    completed,
  }: { assetId: string; position: number; duration: number; completed: boolean }): void {
    this.db
      .prepare(
        `
      INSERT INTO UserProgress (asset_id, position, max_position, completed, updated_at)
      VALUES (?, ?, ?, ?, datetime('now'))
      ON CONFLICT(asset_id) DO UPDATE SET
        position     = excluded.position,
        max_position = MAX(max_position, excluded.max_position),
        completed    = MAX(completed, excluded.completed),
        updated_at   = excluded.updated_at
    `,
      )
      .run(assetId, position, duration, completed ? 1 : 0);
  }

  markCourseStatus({
    courseId,
    status,
  }: { courseId: string, status: ProgressStatus }): void {
    this.db
      .prepare(
        `
      INSERT INTO UserCourseProgress (course_id, status, updated_at)
      VALUES (?, ?, datetime('now'))
      ON CONFLICT(course_id) DO UPDATE SET
        status     = excluded.status,
        updated_at = excluded.updated_at
    `,
      )
      .run(courseId, status);
  }

  recalculateCourseProgress(courseId: string): void {
    this.db.prepare(`
      INSERT INTO UserCourseProgress (course_id, completed_assets, in_progress_assets, total_assets, status, updated_at)
      SELECT 
          ca.course_id,
          COUNT(CASE WHEN up.completed = 1 THEN 1 END) as completed_assets,
          COUNT(CASE WHEN (up.completed = 0 OR up.completed IS NULL) AND up.position > 0 THEN 1 END) as in_progress_assets,
          COUNT(CASE WHEN ca.status = 'COMPLETED' THEN 1 END) as total_assets,
          CASE 
              WHEN COUNT(CASE WHEN up.completed = 1 THEN 1 END) = COUNT(CASE WHEN ca.status = 'COMPLETED' THEN 1 END) AND COUNT(CASE WHEN ca.status = 'COMPLETED' THEN 1 END) > 0 THEN 'completed'
              WHEN COUNT(CASE WHEN up.completed = 1 OR up.position > 0 THEN 1 END) > 0 THEN 'in_progress'
              ELSE 'not_started'
          END as status,
          datetime('now')
      FROM Course_Assets ca
      LEFT JOIN UserProgress up ON ca.id = up.asset_id
      WHERE ca.course_id = ?
      GROUP BY ca.course_id
      ON CONFLICT(course_id) DO UPDATE SET
          completed_assets = excluded.completed_assets,
          in_progress_assets = excluded.in_progress_assets,
          total_assets = excluded.total_assets,
          status = excluded.status,
          updated_at = excluded.updated_at
    `).run(courseId);
  }

  recalculateLearningPathProgress(pathId: string): void {
    this.db.prepare(`
      INSERT INTO UserLearningPathProgress (path_id, completed_courses, in_progress_courses, total_courses, status, updated_at)
      SELECT 
          lpc.path_id,
          COUNT(CASE WHEN ucp.status = 'completed' THEN 1 END) as completed_courses,
          COUNT(CASE WHEN ucp.status = 'in_progress' THEN 1 END) as in_progress_courses,
          COUNT(CASE WHEN ucp.total_assets > 0 THEN 1 END) as total_courses,
          CASE 
              WHEN COUNT(CASE WHEN ucp.status = 'completed' THEN 1 END) = COUNT(CASE WHEN ucp.total_assets > 0 THEN 1 END) AND COUNT(CASE WHEN ucp.total_assets > 0 THEN 1 END) > 0 THEN 'completed'
              WHEN COUNT(CASE WHEN ucp.status IN ('completed', 'in_progress') THEN 1 END) > 0 THEN 'in_progress'
              ELSE 'not_started'
          END as status,
          datetime('now')
      FROM LearningPath_Courses lpc
      LEFT JOIN UserCourseProgress ucp ON ucp.course_id = lpc.course_id
      WHERE lpc.path_id = ?
      GROUP BY lpc.path_id
      ON CONFLICT(path_id) DO UPDATE SET
          completed_courses = excluded.completed_courses,
          in_progress_courses = excluded.in_progress_courses,
          total_courses = excluded.total_courses,
          status = excluded.status,
          updated_at = excluded.updated_at
    `).run(pathId);
  }

  getLearningPathsForCourse(courseId: string): string[] {
    const rows = this.db
      .prepare("SELECT path_id FROM LearningPath_Courses WHERE course_id = ?")
      .all(courseId) as any[];
    return rows.map(r => r.path_id);
  }

  getCourseIdsForAsset(assetId: string): string[] {
    const rows = this.db
      .prepare("SELECT course_id FROM Course_Assets WHERE id = ?")
      .all(assetId) as any[];
    return rows.map(r => r.course_id);
  }
}
