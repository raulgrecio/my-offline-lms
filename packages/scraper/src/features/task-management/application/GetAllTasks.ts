import type { ITaskRepository } from '../domain/ports/ITaskRepository';
import { ScraperTask } from '../domain/models/ScraperTask';

export class GetAllTasks {
  constructor(private readonly taskRepo: ITaskRepository) { }

  async execute(): Promise<ScraperTask[]> {
    return this.taskRepo.findAll();
  }
}
