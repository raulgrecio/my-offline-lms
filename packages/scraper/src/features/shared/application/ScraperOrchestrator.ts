import { type ILogger } from '@core/logging';
import { type ValidateAuthSession } from '../../auth-session';
import { type UpdateTask, type GetTaskById, type StartTask } from '../../task-management';

export interface ExecutionOptions {
  taskId?: string;
  mainStep: string;
  successMessage?: string;
  onCleanup?: () => Promise<void>;
}

/**
 * Orchestrates the execution of a scraper task, managing its lifecycle:
 * auth check, progress updates, cancellation logic, and error handling.
 */
export class ScraperOrchestrator {
  private readonly logger: ILogger;

  constructor(private readonly deps: {
    validator: ValidateAuthSession;
    updateTask: UpdateTask;
    getTaskById: GetTaskById;
    startTask: StartTask;
    logger: ILogger;
  }) {
    this.logger = deps.logger.withContext("ScraperOrchestrator");
  }

  async run(options: ExecutionOptions, work: () => Promise<void>): Promise<void> {
    const { taskId, mainStep, successMessage = 'Proceso finalizado con éxito', onCleanup } = options;

    try {
      // Step 1: Start Task & Auth Validation
      if (taskId) {
        await this.deps.startTask.execute({ id: taskId });
      }

      if (!(await this.deps.validator.execute())) {
        throw new Error("Necesitas iniciar sesión. Ejecuta 'pnpm cli login'.");
      }

      // Step 2: Pre-execution Cancellation check
      await this.checkCancellation(taskId);

      // Step 3: Start Execution
      if (taskId) {
        await this.deps.updateTask.execute({ 
          id: taskId, 
          progress: { step: mainStep } 
        });
      }

      await work();

      // Step 4: Success Transition
      if (taskId) {
        await this.deps.updateTask.execute({ 
          id: taskId, 
          status: 'COMPLETED', 
          progress: { step: successMessage } 
        });
      }
    } catch (err: any) {
      if (err.message === 'TASK_CANCELLED') {
        this.logger.info(`Tarea cancelada: ${taskId}`);
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
      if (onCleanup) {
        await onCleanup();
      }
    }
  }

  private async checkCancellation(taskId?: string) {
    if (!taskId) return;
    const task = await this.deps.getTaskById.execute({ id: taskId });
    if (task?.status === 'CANCELLED') {
      throw new Error('TASK_CANCELLED');
    }
  }
}
