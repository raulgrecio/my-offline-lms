import { db } from '../../db/schema';
import { Asset, AssetStatus, AssetType } from '../../domain/models/Asset';
import { IAssetRepository } from '../../domain/repositories/ICourseRepository';

export class SQLiteAssetRepository implements IAssetRepository {
  saveAsset(asset: Asset): void {
    db.prepare(`
        INSERT INTO Course_Assets (id, course_id, type, url, metadata, status, local_path)
        VALUES (@id, @course_id, @type, @url, @metadata, @status, @local_path)
        ON CONFLICT(id) DO UPDATE SET 
            type=excluded.type, 
            url=excluded.url,
            metadata=excluded.metadata,
            status=excluded.status,
            local_path=excluded.local_path
    `).run({
      id: asset.id,
      course_id: asset.courseId,
      type: asset.type,
      url: asset.url,
      metadata: asset.metadata ? JSON.stringify(asset.metadata) : '{}',
      status: asset.status,
      local_path: asset.localPath || null
    });
  }

  updateAssetStatus(id: string, status: AssetStatus): void {
    db.prepare("UPDATE Course_Assets SET status = ? WHERE id = ?").run(status, id);
  }

  updateAssetCompletion(id: string, metadata: any, localPath?: string): void {
    db.prepare("UPDATE Course_Assets SET status = 'COMPLETED', metadata = ?, local_path = COALESCE(?, local_path) WHERE id = ?")
      .run(JSON.stringify(metadata), localPath || null, id);
  }

  getAssetById(id: string): Asset | null {
    const row = db.prepare('SELECT * FROM Course_Assets WHERE id = ?').get(id) as any;
    if (!row) return null;
    
    // map DB to Domain
    return {
      id: row.id,
      courseId: row.course_id,
      type: row.type,
      url: row.url,
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
      status: row.status,
      localPath: row.local_path
    };
  }

  countAssetsByCourseId(courseId: string): number {
    const res = db.prepare("SELECT COUNT(*) as count FROM Course_Assets WHERE course_id = ?").get(courseId) as { count: number };
    return res.count;
  }

  getPendingAssets(courseId: string, type: AssetType): Asset[] {
     const rows = db.prepare(`
        SELECT * FROM Course_Assets 
        WHERE course_id = ? AND type = ? AND status != 'COMPLETED'
     `).all(courseId, type) as any[];

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
