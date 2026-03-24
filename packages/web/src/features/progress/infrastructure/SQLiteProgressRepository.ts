import { type Asset, type AssetType } from '@my-offline-lms/core/models';
import type { IDatabase } from '@my-offline-lms/core/database';


import type { AssetProgress } from "../domain/model/AssetProgress";
import type { CollectionProgress } from "../domain/model/CollectionProgress";
import type { CollectionType } from "../domain/model/CollectionType";
import type { ProgressStatus } from "../domain/model/ProgressStatus";
import type { IProgressRepository } from "../domain/ports/IProgressRepository";

export class SQLiteProgressRepository implements IProgressRepository {
  constructor(private db: IDatabase) { }

  getAssetProgress({ id, type }: { id: string, type: AssetType }): AssetProgress | null {
    const row = this.db
      .prepare(
        "SELECT asset_id, asset_type, position, max_position, visited_segments, total_segments, completed, updated_at FROM UserProgress WHERE asset_id = ? AND asset_type = ?",
      )
      .get(id, type) as any;

    if (!row) return null;
    const currentPos = row.position || 0;
    const maxPos = row.max_position || 0;

    return {
      id: row.asset_id,
      type: (row.asset_type || type) as AssetType,
      position: currentPos,
      maxPosition: Math.max(currentPos, maxPos),
      visitedSegments: row.visited_segments || 0,
      totalSegments: row.total_segments || 0,
      completed: row.completed === 1,
      updatedAt: row.updated_at,
    };
  }


  getCollectionProgress({ id, type }: { id: string; type: CollectionType }): CollectionProgress | null {
    const row = this.db
      .prepare(
        "SELECT id, type, status, completed_items, in_progress_items, total_items, updated_at FROM UserCollectionProgress WHERE id = ? AND type = ?",
      )
      .get(id, type) as any;
    if (!row) return null;
    return {
      id: row.id,
      type: (row.type || type) as CollectionType,
      status: row.status as ProgressStatus,
      completedItems: row.completed_items || 0,
      inProgressItems: row.in_progress_items || 0,
      totalItems: row.total_items || 0,
      updatedAt: row.updated_at,
    };
  }

  getAllCollectionsProgress(type: CollectionType): CollectionProgress[] {
    return (
      this.db
        .prepare(
          "SELECT id, type, status, completed_items, in_progress_items, total_items, updated_at FROM UserCollectionProgress WHERE type = ?",
        )
        .all(type) as any[]
    ).map((row) => ({
      id: row.id,
      type: row.type as CollectionType,
      status: row.status as ProgressStatus,
      completedItems: row.completed_items || 0,
      inProgressItems: row.in_progress_items || 0,
      totalItems: row.total_items || 0,
      updatedAt: row.updated_at || undefined,
    }));
  }

  getLastWatchedAsset(): (Asset & { position: number }) | null {
    const row = this.db
      .prepare(
        `
      SELECT ca.*, up.position
      FROM UserProgress up
      JOIN Course_Assets ca ON ca.id = up.asset_id AND ca.type = up.asset_type
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

  saveAssetProgress({
    id,
    type,
    position,
    maxPosition,
    completed,
  }: { id: string; type: string; position: number; maxPosition: number; completed: boolean }): void {
    this.db
      .prepare(
        `
      INSERT INTO UserProgress (asset_id, asset_type, position, max_position, completed, updated_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(asset_id, asset_type) DO UPDATE SET
        position     = excluded.position,
        max_position = MAX(max_position, excluded.max_position),
        completed    = MAX(completed, excluded.completed),
        updated_at   = excluded.updated_at
    `,
      )
      .run(id, type, position, maxPosition, completed ? 1 : 0);
  }

  markCollectionStatus({
    id,
    type,
    status,
  }: { id: string; type: CollectionType; status: ProgressStatus }): void {
    this.db
      .prepare(
        `
      INSERT INTO UserCollectionProgress (id, type, status, updated_at)
      VALUES (?, ?, ?, datetime('now'))
      ON CONFLICT(id, type) DO UPDATE SET
        status     = excluded.status,
        updated_at = excluded.updated_at
    `,
      )
      .run(id, type, status);
  }

  recalculateCourseProgress(id: string): void {
    this.db.prepare(`
      INSERT INTO UserCollectionProgress (id, type, completed_items, in_progress_items, total_items, status, updated_at)
      SELECT 
          ca.course_id,
          'course',
          COUNT(CASE WHEN up.completed = 1 THEN 1 END) as completed_items,
          COUNT(CASE WHEN (up.completed = 0 OR up.completed IS NULL) AND up.position > 0 THEN 1 END) as in_progress_items,
          COUNT(CASE WHEN ca.status = 'COMPLETED' THEN 1 END) as total_items,
          CASE 
              WHEN COUNT(CASE WHEN up.completed = 1 THEN 1 END) = COUNT(CASE WHEN ca.status = 'COMPLETED' THEN 1 END) AND COUNT(CASE WHEN ca.status = 'COMPLETED' THEN 1 END) > 0 THEN 'completed'
              WHEN COUNT(CASE WHEN up.completed = 1 OR up.position > 0 THEN 1 END) > 0 THEN 'in_progress'
              ELSE 'not_started'
          END as status,
          datetime('now')
      FROM Course_Assets ca
      LEFT JOIN UserProgress up ON ca.id = up.asset_id AND ca.type = up.asset_type
      WHERE ca.course_id = ?
      GROUP BY ca.course_id
      ON CONFLICT(id, type) DO UPDATE SET
          completed_items = excluded.completed_items,
          in_progress_items = excluded.in_progress_items,
          total_items = excluded.total_items,
          status = excluded.status,
          updated_at = excluded.updated_at
    `).run(id);
  }

  recalculateLearningPathProgress(id: string): void {
    this.db.prepare(`
      INSERT INTO UserCollectionProgress (id, type, completed_items, in_progress_items, total_items, status, updated_at)
      SELECT 
          lpc.path_id,
          'learning-path',
          COUNT(CASE WHEN ucp.status = 'completed' THEN 1 END) as completed_items,
          COUNT(CASE WHEN ucp.status = 'in_progress' THEN 1 END) as in_progress_items,
          COUNT(CASE WHEN ucp.total_items > 0 THEN 1 END) as total_items,
          CASE 
              WHEN COUNT(CASE WHEN ucp.status = 'completed' THEN 1 END) = COUNT(CASE WHEN ucp.total_items > 0 THEN 1 END) AND COUNT(CASE WHEN ucp.total_items > 0 THEN 1 END) > 0 THEN 'completed'
              WHEN COUNT(CASE WHEN ucp.status IN ('completed', 'in_progress') THEN 1 END) > 0 THEN 'in_progress'
              ELSE 'not_started'
          END as status,
          datetime('now')
      FROM LearningPath_Courses lpc
      LEFT JOIN UserCollectionProgress ucp ON ucp.id = lpc.course_id AND ucp.type = 'course'
      WHERE lpc.path_id = ?
      GROUP BY lpc.path_id
      ON CONFLICT(id, type) DO UPDATE SET
          completed_items = excluded.completed_items,
          in_progress_items = excluded.in_progress_items,
          total_items = excluded.total_items,
          status = excluded.status,
          updated_at = excluded.updated_at
    `).run(id);
  }

  getLearningPathsForCourse(id: string): string[] {
    const rows = this.db
      .prepare("SELECT path_id FROM LearningPath_Courses WHERE course_id = ?")
      .all(id) as any[];
    return rows.map(r => r.path_id);
  }

  getCourseIdsForAsset(id: string): string[] {
    const rows = this.db
      .prepare("SELECT course_id FROM Course_Assets WHERE id = ?")
      .all(id) as any[];
    return rows.map(r => r.course_id);
  }

  saveSegment({ id, type, segment }: { id: string; type: string; segment: number }): boolean {
    const result = this.db
      .prepare(
        "INSERT OR IGNORE INTO UserAssetSegments (asset_id, asset_type, segment) VALUES (?, ?, ?)",
      )
      .run(id, type, segment);
    return result.changes > 0;
  }

  incrementVisitedSegments({ id, type }: { id: string, type: string }): void {
    this.db
      .prepare(
        "UPDATE UserProgress SET visited_segments = visited_segments + 1 WHERE asset_id = ? AND asset_type = ?",
      )
      .run(id, type);
  }

  setTotalSegments({ id, type, totalSegments }: { id: string, type: string, totalSegments: number }): void {
    this.db
      .prepare(
        "UPDATE UserProgress SET total_segments = ? WHERE asset_id = ? AND asset_type = ?",
      )
      .run(totalSegments, id, type);
  }

  getVisitedSegmentsCount({ id, type }: { id: string, type: string }): number {
    const row = this.db
      .prepare("SELECT COUNT(*) as count FROM UserAssetSegments WHERE asset_id = ? AND asset_type = ?")
      .get(id, type) as any;
    return row?.count || 0;
  }

  getVisitedSegments({ id, type }: { id: string; type: string }): number[] {
    const rows = this.db
      .prepare(
        "SELECT segment FROM UserAssetSegments WHERE asset_id = ? AND asset_type = ? ORDER BY segment ASC",
      )
      .all(id, type) as any[];
    return rows.map((r) => r.segment) || [];
  }
}
