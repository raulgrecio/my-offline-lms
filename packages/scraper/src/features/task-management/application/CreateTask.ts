import { ScraperTask, type ScraperTaskCategoryType, type ScraperTaskActionType } from '../domain/models/ScraperTask';
import type { ITaskRepository } from '../domain/ports/ITaskRepository';

export interface CreateTaskInput {
  id: string;
  type: ScraperTaskCategoryType;
  action: ScraperTaskActionType;
  url: string;
  targetId?: string;
  metadata?: Record<string, any>;
}

export class CreateTask {
  constructor(private readonly taskRepo: ITaskRepository) { }

  async execute(input: CreateTaskInput): Promise<string> {
    const task = ScraperTask.create({
      id: input.id,
      type: input.type,
      action: input.action,
      url: input.url,
      targetId: input.targetId,
      metadata: input.metadata
    });

    await this.taskRepo.save(task);

    return task.id;
  }
}
