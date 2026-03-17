import { type Asset, type IDatabase } from "@my-offline-lms/core";

import type { CourseProgress, CourseStatusType } from "../domain/model/CourseProgress";
import type { VideoProgress } from "../domain/model/VideoProgress";
import type { PdfProgress } from "../domain/model/PdfProgress";
import type { IProgressRepository } from "../domain/ports/IProgressRepository";

export class SQLiteProgressRepository implements IProgressRepository {
  constructor(private db: IDatabase) { }

  getVideoProgress(assetId: string): VideoProgress | null {
    const row = this.db
      .prepare(
        "SELECT asset_id, position_sec, max_position, completed, updated_at FROM UserProgress WHERE asset_id = ?",
      )
      .get(assetId) as any;
    if (!row) return null;
    const currentPos = row.position_sec || 0;
    const maxPos = row.max_position || 0;
    
    return {
      assetId: row.asset_id,
      positionSec: currentPos,
      maxPositionSec: Math.max(currentPos, maxPos),
      completed: row.completed === 1,
      updatedAt: row.updated_at,
    };
  }

  getGuideProgress(assetId: string): PdfProgress | null {
    const row = this.db
      .prepare(
        "SELECT asset_id, position_sec, max_position, completed, updated_at FROM UserProgress WHERE asset_id = ?",
      )
      .get(assetId) as any;
    if (!row) return null;
    const currentPg = row.position_sec || 0;
    const maxPg = row.max_position || 0;

    return {
      assetId: row.asset_id,
      page: currentPg,
      maxPage: Math.max(currentPg, maxPg),
      completed: row.completed === 1,
      updatedAt: row.updated_at,
    };
  }

  getCourseProgress(courseId: string): CourseProgress | null {
    const row = this.db
      .prepare(
        "SELECT course_id, status, updated_at FROM UserCourseProgress WHERE course_id = ?",
      )
      .get(courseId) as any;
    if (!row) return null;
    return {
      courseId: row.course_id,
      status: row.status,
      updatedAt: row.updated_at,
    };
  }

  getAllCourseProgress(): CourseProgress[] {
    return (
      this.db
        .prepare("SELECT course_id, status, updated_at FROM UserCourseProgress")
        .all() as any[]
    ).map((row) => ({
      courseId: row.course_id,
      status: row.status,
      updatedAt: row.updated_at,
    }));
  }

  getLastWatchedAsset(): (Asset & { positionSec: number }) | null {
    const row = this.db
      .prepare(
        `
      SELECT ca.*, up.position_sec
      FROM UserProgress up
      JOIN Course_Assets ca ON ca.id = up.asset_id
      WHERE up.completed = 0 AND ca.type = 'video' AND ca.status = 'COMPLETED'
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
      positionSec: row.position_sec,
    };
  }

  updateVideoProgress({
    assetId,
    positionSec,
    completed = false,
  }: { assetId: string; positionSec: number; completed?: boolean }): void {
    this.db
      .prepare(
        `
      INSERT INTO UserProgress (asset_id, position_sec, max_position, completed, updated_at)
      VALUES (?, ?, ?, ?, datetime('now'))
      ON CONFLICT(asset_id) DO UPDATE SET
        position_sec = excluded.position_sec,
        max_position = MAX(max_position, excluded.max_position),
        completed    = CASE WHEN excluded.completed = 1 THEN 1 ELSE completed END,
        updated_at   = excluded.updated_at
    `,
      )
      .run(assetId, positionSec, positionSec, completed ? 1 : 0);
  }

  updatePdfProgress({
    assetId,
    page,
    completed = false,
  }: { assetId: string, page: number, completed?: boolean }): void {
    this.db
      .prepare(
        `
      INSERT INTO UserProgress (asset_id, position_sec, max_position, completed, updated_at)
      VALUES (?, ?, ?, ?, datetime('now'))
      ON CONFLICT(asset_id) DO UPDATE SET
        position_sec = excluded.position_sec,
        max_position = MAX(max_position, excluded.max_position),
        completed    = CASE WHEN excluded.completed = 1 THEN 1 ELSE completed END,
        updated_at   = excluded.updated_at
    `,
      )
      .run(assetId, page, page, completed ? 1 : 0);
  }

  markCourseStatus({
    courseId,
    status,
  }: { courseId: string, status: CourseStatusType }): void {
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
}
