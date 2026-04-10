import type { IDatabase } from '@core/database/IDatabase';
import { ScraperTask, type ScraperTaskStatusType, type ScraperTaskProgress } from '../domain/models/ScraperTask';
import type { ITaskRepository } from '../domain/ports/ITaskRepository';

export class SQLiteTaskRepository implements ITaskRepository {
  constructor(private readonly db: IDatabase) { }

  async save(task: ScraperTask): Promise<void> {
    this.db.prepare(
      'INSERT OR REPLACE INTO Scraper_Tasks (id, type, action, target_id, url, status, progress, error, metadata, updatedAt, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(
      task.id,
      task.type,
      task.action,
      task.targetId,
      task.url,
      task.status,
      task.progress ? JSON.stringify(task.progress) : null,
      task.error,
      task.metadata ? JSON.stringify(task.metadata) : null,
      task.updatedAt.toISOString(),
      task.createdAt.toISOString(),
    );
  }

  async update(id: string, data: Partial<{ status: ScraperTaskStatusType, progress: Partial<ScraperTaskProgress>, error: string, metadata: Record<string, any> }>): Promise<void> {
    const updates: string[] = [];
    const values: any[] = [];

    if (data.status) {
      updates.push('status = ?');
      values.push(data.status);
    }
    if (data.progress) {
      updates.push('progress = json_patch(COALESCE(progress, \'{}\'), ?)');
      values.push(JSON.stringify(data.progress));
    }
    if (data.error) {
      updates.push('error = ?');
      values.push(data.error);
    }
    if (data.metadata) {
      updates.push('metadata = json_patch(COALESCE(metadata, \'{}\'), ?)');
      values.push(JSON.stringify(data.metadata));
    }

    if (updates.length > 0) {
      updates.push('updatedAt = CURRENT_TIMESTAMP');
      this.db.prepare(
        `UPDATE Scraper_Tasks SET ${updates.join(', ')} WHERE id = ?`
      ).run(...values, id);
    }
  }

  async findById(id: string): Promise<ScraperTask | null> {
    const row = this.db.prepare('SELECT * FROM Scraper_Tasks WHERE id = ?').get(id) as any;
    if (!row) return null;
    return this.mapToEntity(row);
  }

  async findActive(): Promise<ScraperTask | null> {
    const row = this.db.prepare(
      'SELECT * FROM Scraper_Tasks WHERE status = ? ORDER BY createdAt DESC LIMIT 1'
    ).get('RUNNING') as any;
    if (!row) return null;
    return this.mapToEntity(row);
  }

  async findAll(): Promise<ScraperTask[]> {
    const rows = this.db.prepare(
      'SELECT * FROM Scraper_Tasks ORDER BY createdAt DESC'
    ).all() as any[];
    return rows.map(row => this.mapToEntity(row));
  }

  async delete(id: string): Promise<void> {
    this.db.prepare('DELETE FROM Scraper_Tasks WHERE id = ?').run(id);
  }

  private mapToEntity(row: any): ScraperTask {
    return new ScraperTask(
      row.id,
      row.type,
      row.action,
      row.url,
      row.target_id,
      row.status,
      row.progress ? JSON.parse(row.progress) : null,
      row.error,
      row.metadata ? JSON.parse(row.metadata) : null,
      new Date(row.createdAt),
      new Date(row.updatedAt)
    );
  }
}
