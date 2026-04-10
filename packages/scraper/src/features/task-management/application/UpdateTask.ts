import type { ITaskRepository } from '../domain/ports/ITaskRepository';
import { type ScraperTaskStatusType } from '../domain/models/ScraperTask';

export interface UpdateTaskInput {
  id: string;
  status?: ScraperTaskStatusType;
  progress?: any;
  error?: string;
}

export class UpdateTask {
  constructor(private readonly taskRepo: ITaskRepository) { }

  async execute(input: UpdateTaskInput): Promise<void> {
    const { id, ...data } = input;
    await this.taskRepo.update(id, data);
  }
}

