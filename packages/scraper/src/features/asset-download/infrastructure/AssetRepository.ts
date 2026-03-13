import { Asset, AssetStatus, AssetType } from '@features/asset-download/domain/models/Asset';
import { IAssetRepository } from '@features/asset-download/domain/ports/IAssetRepository';
import { IDatabase } from '@platform/database/IDatabase';

export class SQLiteAssetRepository implements IAssetRepository {
  constructor(private db: IDatabase) {}

  saveAsset(asset: Asset): void {
    this.db.prepare(`
        INSERT INTO Course_Assets (id, course_id, type, url, metadata, status, local_path)
        VALUES (@id, @course_id, @type, @url, @metadata, @status, @local_path)
        ON CONFLICT(id) DO UPDATE SET 
            type=excluded.type, 
            url=excluded.url,
            metadata=excluded.metadata
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
    this.db.prepare("UPDATE Course_Assets SET status = ? WHERE id = ?").run(status, id);
  }

  updateAssetCompletion(id: string, metadata: any, localPath?: string): void {
    this.db.prepare("UPDATE Course_Assets SET status = 'COMPLETED', metadata = ?, local_path = COALESCE(?, local_path) WHERE id = ?")
      .run(JSON.stringify(metadata), localPath || null, id);
  }

  getAssetById(id: string): Asset | null {
    const row = this.db.prepare('SELECT * FROM Course_Assets WHERE id = ?').get(id) as any;
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
    } as Asset;
  }

  countAssetsByCourseId(courseId: string): number {
    const res = this.db.prepare("SELECT COUNT(*) as count FROM Course_Assets WHERE course_id = ?").get(courseId) as { count: number };
    return res.count;
  }

  getPendingAssets(courseId: string, type: AssetType): Asset[] {
     const rows = this.db.prepare(`
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
    } as Asset));
  }
}
