import { type ILogger } from '@core/logging';

import { type ValidateAuthSession } from '@scraper/features/auth-session';

import { TaskBroker, CANCEL_TASK_COMMAND } from '../infrastructure/TaskBroker';
import { AbortContext } from './AbortContext';
import { UpdateTask } from './UpdateTask';
import { GetTaskById } from './GetTaskById';
import { StartTask } from './StartTask';

export interface ExecutionOptions {
  taskId?: string;
  mainStep: string;
  successMessage?: string;
  onCleanup?: () => Promise<void>;
}

export const TASK_CANCELLED_ERROR = 'TASK_CANCELLED';

/**
 * Orchestrates the execution of a scraper task, managing its lifecycle:
 * auth check, progress updates, cancellation logic, and error handling.
 */
export class TaskOrchestrator {
  private readonly logger: ILogger;
  private readonly controllers = new Map<string, AbortController>();

  constructor(private readonly deps: {
    validator: ValidateAuthSession;
    updateTask: UpdateTask;
    getTaskById: GetTaskById;
    startTask: StartTask;
    logger: ILogger;
  }) {
    this.logger = deps.logger.withContext("TaskOrchestrator");

    // Listen for reactive cancellation commands
    TaskBroker.subscribe((command) => {
      if (command.type === CANCEL_TASK_COMMAND) {
        this.abortTask(command.payload.taskId);
      }
    });
  }

  async run(options: ExecutionOptions, work: () => Promise<void>): Promise<void> {
    const { taskId, mainStep, successMessage = 'Proceso finalizado con éxito', onCleanup } = options;

    // Create abort controller for this execution
    const controller = new AbortController();
    if (taskId) {
      this.controllers.set(taskId, controller);
    }

    try {
      // Step 1: Start Task & Auth Validation
      if (taskId) {
        await this.deps.startTask.execute({ id: taskId });
      }

      if (!(await this.deps.validator.execute())) {
        throw new Error("Necesitas iniciar sesión. Ejecuta 'pnpm cli login'.");
      }

      // Step 2: Pre-execution Cancellation check
      if (taskId) {
        const task = await this.deps.getTaskById.execute({ id: taskId });
        if (task?.status === 'CANCELLED') {
          throw new Error(TASK_CANCELLED_ERROR);
        }
      }

      // Step 3: Start Execution
      if (taskId) {
        await this.deps.updateTask.execute({
          id: taskId,
          progress: { step: mainStep }
        });
      }

      // Execute actual work — signal is available via AbortContext.getSignal() / AbortContext.throwIfAborted()
      await AbortContext.run(controller.signal, work);

      // Check if it was aborted gracefully inside work()
      if (controller.signal.aborted) {
        throw new Error(TASK_CANCELLED_ERROR);
      }

      // Step 4: Success Transition
      if (taskId) {
        await this.deps.updateTask.execute({
          id: taskId,
          status: 'COMPLETED',
          progress: { step: successMessage }
        });
      }
    } catch (err: any) {
      // It is a cancellation if explicitly thrown or if the signal was triggered
      const isCancellation = err.message === TASK_CANCELLED_ERROR || controller.signal.aborted;

      if (isCancellation) {
        this.logger.info(`Tarea cancelada reactivamente: ${taskId}`);
        if (taskId) {
          await this.deps.updateTask.execute({
            id: taskId,
            status: 'CANCELLED',
            progress: { step: 'Proceso cancelado por el usuario' }
          });
        }
      } else {
        this.logger.error(`Error en la ejecución de la tarea (${taskId || 'CLI'}):`, err);
        if (taskId) {
          await this.deps.updateTask.execute({
            id: taskId,
            status: 'FAILED',
            error: err.message
          });
        }
        throw err;
      }
    } finally {
      if (taskId) {
        this.controllers.delete(taskId);
      }
      if (onCleanup) {
        await onCleanup();
      }
    }
  }

  /**
   * Triggers immediate cancellation of a running task
   */
  abortTask(taskId: string) {
    const controller = this.controllers.get(taskId);
    if (controller) {
      this.logger.info(`Abortando tarea ${taskId} via AbortController...`);
      controller.abort();
    }
  }

}
