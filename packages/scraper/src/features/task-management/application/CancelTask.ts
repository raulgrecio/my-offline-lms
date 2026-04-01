import type { ITaskRepository } from '../domain/ports/ITaskRepository';

interface CancelTaskInput {
  id: string;
}

export class CancelTask {
  constructor(private readonly taskRepo: ITaskRepository) {}

  async execute(input: CancelTaskInput): Promise<void> {
    await this.taskRepo.update(input.id, { status: 'CANCELLED' });
  }
}
