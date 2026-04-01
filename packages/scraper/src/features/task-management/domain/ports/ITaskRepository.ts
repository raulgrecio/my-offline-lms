import { ScraperTask, type ScraperTaskStatus } from '../models/ScraperTask';

export interface ITaskRepository {
  save(task: ScraperTask): Promise<void>;
  update(id: string, data: Partial<{ status: ScraperTaskStatus, progress: any, error: string }>): Promise<void>;
  findById(id: string): Promise<ScraperTask | null>;
  findActive(): Promise<ScraperTask | null>;
}
