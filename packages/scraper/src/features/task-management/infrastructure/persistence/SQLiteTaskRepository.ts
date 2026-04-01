import type { IDatabase } from '@core/database/IDatabase';
import { ScraperTask, type ScraperTaskStatus } from '../../domain/models/ScraperTask';
import type { ITaskRepository } from '../../domain/ports/ITaskRepository';

export class SQLiteTaskRepository implements ITaskRepository {
  constructor(private readonly db: IDatabase) {}

  async save(task: ScraperTask): Promise<void> {
    this.db.prepare(
      'INSERT INTO Scraper_Tasks (id, type, target_id, url, status, progress, error, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(
      task.id,
      task.type,
      task.targetId,
      task.url,
      task.status,
      task.progress ? JSON.stringify(task.progress) : null,
      task.error,
      task.createdAt.toISOString(),
      task.updatedAt.toISOString()
    );
  }

  async update(id: string, data: Partial<{ status: ScraperTaskStatus, progress: any, error: string }>): Promise<void> {
    const updates: string[] = [];
    const values: any[] = [];

    if (data.status) {
      updates.push('status = ?');
      values.push(data.status);
    }
    if (data.progress) {
      updates.push('progress = ?');
      values.push(JSON.stringify(data.progress));
    }
    if (data.error) {
      updates.push('error = ?');
      values.push(data.error);
    }

    updates.push('updatedAt = CURRENT_TIMESTAMP');

    if (updates.length > 0) {
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

  private mapToEntity(row: any): ScraperTask {
    return new ScraperTask(
      row.id,
      row.type,
      row.url,
      row.target_id,
      row.status,
      row.progress ? JSON.parse(row.progress) : null,
      row.error,
      new Date(row.createdAt),
      new Date(row.updatedAt)
    );
  }
}
