import type { ITaskRepository } from '../domain/ports/ITaskRepository';

interface StartTaskInput {
  id: string;
}

export class StartTask {
  constructor(private readonly taskRepo: ITaskRepository) { }

  async execute(input: StartTaskInput): Promise<void> {
    const task = await this.taskRepo.findById(input.id);
    if (!task) {
      throw new Error(`Task with id ${input.id} not found`);
    }

    task.start();
    await this.taskRepo.update(task.id, { status: task.status, progress: task.progress ?? undefined });
  }
}
