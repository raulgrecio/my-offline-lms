import type { ITaskRepository } from '../domain/ports/ITaskRepository';
import type { ScraperTask } from '../domain/models/ScraperTask';

interface GetTaskByIdInput {
  id: string;
}

export class GetTaskById {
  constructor(private readonly taskRepo: ITaskRepository) {}

  async execute(input: GetTaskByIdInput): Promise<ScraperTask | null> {
    return this.taskRepo.findById(input.id);
  }
}
