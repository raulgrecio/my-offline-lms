import type { ITaskRepository } from '../domain/ports/ITaskRepository';
import { type ScraperTaskStatus } from '../domain/models/ScraperTask';

export interface UpdateTaskInput {
  id: string;
  status?: ScraperTaskStatus;
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

