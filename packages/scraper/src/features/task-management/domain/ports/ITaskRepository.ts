import { ScraperTask, type ScraperTaskStatusType, type ScraperTaskProgress } from '../models/ScraperTask';

export interface ITaskRepository {
  save(task: ScraperTask): Promise<void>;
  update(id: string, data: Partial<{ status: ScraperTaskStatusType, progress: Partial<ScraperTaskProgress>, error: string, metadata: Record<string, any> }>): Promise<void>;
  findById(id: string): Promise<ScraperTask | null>;
  findActive(): Promise<ScraperTask | null>;
  findAll(): Promise<ScraperTask[]>;
  delete(id: string): Promise<void>;
}
