export const ScraperTaskStatus = {
  PENDING: 'PENDING',
  RUNNING: 'RUNNING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
} as const;

export type ScraperTaskStatus = (typeof ScraperTaskStatus)[keyof typeof ScraperTaskStatus];

export const ScraperTaskCategory = {
  COURSE: 'course',
  PATH: 'path',
} as const;

export type ScraperTaskCategory = (typeof ScraperTaskCategory)[keyof typeof ScraperTaskCategory];

export const ScraperTaskAction = {
  SYNC_COURSE: 'SYNC_COURSE',
  SYNC_PATH: 'SYNC_PATH',
  DOWNLOAD_COURSE: 'DOWNLOAD_COURSE',
  DOWNLOAD_PATH: 'DOWNLOAD_PATH'
} as const;

export type ScraperTaskAction = (typeof ScraperTaskAction)[keyof typeof ScraperTaskAction];

export interface ScraperTaskProgress {
  step: string;
  status?: string;
  [key: string]: any;
}

export class ScraperTask {
  constructor(
    public readonly id: string,
    public readonly type: ScraperTaskCategory,
    public readonly action: ScraperTaskAction,
    public readonly url: string,
    public readonly targetId: string | null,
    public status: ScraperTaskStatus,
    public progress: ScraperTaskProgress | null,
    public error: string | null,
    public metadata: Record<string, any> | null,
    public readonly createdAt: Date,
    public updatedAt: Date
  ) { }

  static create(data: {
    id: string,
    type: ScraperTaskCategory,
    action: ScraperTaskAction,
    url: string,
    targetId?: string,
    metadata?: Record<string, any>
  }): ScraperTask {
    const now = new Date();
    return new ScraperTask(
      data.id,
      data.type,
      data.action,
      data.url,
      data.targetId || null,
      'PENDING',
      null,
      null,
      data.metadata || null,
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
