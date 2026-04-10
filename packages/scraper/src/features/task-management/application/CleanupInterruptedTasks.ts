import { type ILogger } from '@core/logging';
import { type ITaskRepository } from '../domain/ports/ITaskRepository';

export class CleanupInterruptedTasks {
  constructor(
    private readonly taskRepo: ITaskRepository,
    private readonly logger: ILogger
  ) {
    this.logger = logger.withContext("CleanupInterruptedTasks");
  }

  async execute(): Promise<void> {
    this.logger.info("Iniciando limpieza de tareas interrumpidas...");
    
    const tasks = await this.taskRepo.findAll();
    const runningTasks = tasks.filter(t => t.status === 'RUNNING');

    if (runningTasks.length === 0) {
      this.logger.info("No se detectaron tareas interrumpidas.");
      return;
    }

    this.logger.info(`Detectadas ${runningTasks.length} tareas interrumpidas. Marcándolas como 'FAILED'.`);

    for (const task of runningTasks) {
      this.logger.warn(`Tarea interrumpida detectada: ${task.id} (${task.progress?.step})`);
      await this.taskRepo.update(task.id, {
        status: 'FAILED',
        progress: {
          ...task.progress,
          step: 'Proceso interrumpido (servidor reiniciado)'
        }
      });
    }
  }
}
