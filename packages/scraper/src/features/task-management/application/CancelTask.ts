import type { ITaskRepository } from '../domain/ports/ITaskRepository';
import { TaskBroker, CANCEL_TASK_COMMAND } from '../infrastructure/TaskBroker';

interface CancelTaskInput {
  id: string;
}

export class CancelTask {
  constructor(private readonly taskRepo: ITaskRepository) { }

  async execute(input: CancelTaskInput): Promise<void> {
    await this.taskRepo.update(input.id, { status: 'CANCELLED' });

    // Broadcast the cancellation reactively
    TaskBroker.emit(CANCEL_TASK_COMMAND, input.id);
  }
}
