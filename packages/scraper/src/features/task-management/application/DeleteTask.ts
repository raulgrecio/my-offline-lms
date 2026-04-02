import type { ITaskRepository } from '../domain/ports/ITaskRepository';

interface DeleteTaskInput {
  id: string;
}

export class DeleteTask {
  constructor(private readonly taskRepo: ITaskRepository) { }

  async execute(input: DeleteTaskInput): Promise<void> {
    await this.taskRepo.delete(input.id);
  }
}
