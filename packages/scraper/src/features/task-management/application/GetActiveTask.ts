import type { ITaskRepository } from '../domain/ports/ITaskRepository';
import type { ScraperTask } from '../domain/models/ScraperTask';

export class GetActiveTask {
  constructor(private readonly taskRepo: ITaskRepository) {}

  async execute(): Promise<ScraperTask | null> {
    return this.taskRepo.findActive();
  }
}
