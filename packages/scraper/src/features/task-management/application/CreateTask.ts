import { ScraperTask, type ScraperTaskType } from '../domain/models/ScraperTask';
import type { ITaskRepository } from '../domain/ports/ITaskRepository';

export interface CreateTaskInput {
  id: string;
  type: ScraperTaskType;
  url: string;
  targetId?: string;
}

export class CreateTask {
  constructor(private readonly taskRepo: ITaskRepository) { }

  async execute(input: CreateTaskInput): Promise<string> {
    const task = ScraperTask.create({
      id: input.id,
      type: input.type,
      url: input.url,
      targetId: input.targetId
    });

    await this.taskRepo.save(task);

    return task.id;
  }
}
