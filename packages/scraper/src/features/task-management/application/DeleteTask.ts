import type { ITaskRepository } from '../domain/ports/ITaskRepository';
import { TaskBroker, CANCEL_TASK_COMMAND } from '../infrastructure/TaskBroker';

interface DeleteTaskInput {
  id: string;
}

export class DeleteTask {
  constructor(private readonly taskRepo: ITaskRepository) { }

  async execute(input: DeleteTaskInput): Promise<void> {
    await this.taskRepo.delete(input.id);

    // Broadcast the cancellation to stop the process if running
    TaskBroker.emit(CANCEL_TASK_COMMAND, input.id);
  }
}
