export type ScraperTaskStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
export type ScraperTaskType = 'course' | 'path';

export interface ScraperTaskProgress {
  step: string;
  status?: string;
  [key: string]: any;
}

export class ScraperTask {
  constructor(
    public readonly id: string,
    public readonly type: ScraperTaskType,
    public readonly url: string,
    public readonly targetId: string | null,
    public status: ScraperTaskStatus,
    public progress: ScraperTaskProgress | null,
    public error: string | null,
    public readonly createdAt: Date,
    public updatedAt: Date
  ) { }

  static create(data: { id?: string, type: ScraperTaskType, url: string, targetId?: string }): ScraperTask {
    const now = new Date();
    const id = data.id || Math.random().toString(36).substring(2, 11);
    return new ScraperTask(
      id,
      data.type,
      data.url,
      data.targetId || null,
      'PENDING',
      null,
      null,
      now,
      now
    );
  }

  start() {
    this.status = 'RUNNING';
    this.progress = { step: 'Iniciando proceso...' };
    this.updatedAt = new Date();
  }
}
