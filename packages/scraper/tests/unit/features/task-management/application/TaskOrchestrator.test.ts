import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TaskOrchestrator, TASK_CANCELLED_ERROR, AbortContext } from '@scraper/features/task-management';
import { TaskBroker, CANCEL_TASK_COMMAND } from '@scraper/features/task-management';

describe('TaskOrchestrator', () => {
  let orchestrator: TaskOrchestrator;
  let deps: any;

  beforeEach(() => {
    TaskBroker.reset();
    deps = {
      validator: { execute: vi.fn().mockResolvedValue(true) },
      updateTask: { execute: vi.fn().mockResolvedValue({}) },
      getTaskById: { execute: vi.fn().mockResolvedValue({ id: '1', status: 'PENDING' }) },
      startedTask: { execute: vi.fn().mockResolvedValue({}) }, // Wait, it's startTask in the class
      startTask: { execute: vi.fn().mockResolvedValue({}) },
      logger: { 
        info: vi.fn(), 
        error: vi.fn(), 
        withContext: vi.fn().mockReturnThis() 
      }
    };
    orchestrator = new TaskOrchestrator(deps);
  });

  it('should execute work successfully', async () => {
    const work = vi.fn().mockResolvedValue(undefined);
    await orchestrator.run({ taskId: '1', mainStep: 'Syncing' }, work);

    expect(deps.startTask.execute).toHaveBeenCalledWith({ id: '1' });
    expect(deps.validator.execute).toHaveBeenCalled();
    expect(deps.updateTask.execute).toHaveBeenCalledWith({
      id: '1',
      progress: { step: 'Syncing' }
    });
    expect(work).toHaveBeenCalled();
    expect(deps.updateTask.execute).toHaveBeenCalledWith({
      id: '1',
      status: 'COMPLETED',
      progress: { step: 'Proceso finalizado con éxito' }
    });
  });

  it('should throw if authentication fails', async () => {
    deps.validator.execute.mockResolvedValue(false);
    const work = vi.fn();

    await expect(orchestrator.run({ taskId: '1', mainStep: 'Syncing' }, work))
      .rejects.toThrow("Necesitas iniciar sesión");
    
    expect(deps.updateTask.execute).toHaveBeenCalledWith(expect.objectContaining({
      status: 'FAILED'
    }));
  });

  it('should handle proactive cancellation (task already cancelled in DB)', async () => {
    deps.getTaskById.execute.mockResolvedValue({ id: '1', status: 'CANCELLED' });
    const work = vi.fn();

    await orchestrator.run({ taskId: '1', mainStep: 'Syncing' }, work);
    
    expect(work).not.toHaveBeenCalled();
    expect(deps.updateTask.execute).toHaveBeenCalledWith(expect.objectContaining({
      status: 'CANCELLED'
    }));
  });

  it('should handle reactive cancellation via TaskBroker', async () =>
    new Promise<void>((done) => {
      const work = vi.fn().mockImplementation(async () => {
        // Simulate long running work that reads signal from AbortContext
        return new Promise<void>((resolve, reject) => {
          const signal = AbortContext.getSignal();
          if (!signal) return resolve();
          signal.onabort = () => reject(new Error(TASK_CANCELLED_ERROR));
        });
      });

      const runPromise = orchestrator.run({ taskId: 'task-abc', mainStep: 'Sync' }, work);

      // Give some time for the task to start
      setTimeout(() => {
        TaskBroker.emit(CANCEL_TASK_COMMAND, 'task-abc');
      }, 10);

      runPromise.then(() => {
        expect(deps.updateTask.execute).toHaveBeenCalledWith(expect.objectContaining({
          id: 'task-abc',
          status: 'CANCELLED'
        }));
        done();
      }).catch(done);
    })
  );

  it('should handle generic errors and mark task as FAILED', async () => {
    const work = vi.fn().mockRejectedValue(new Error("Unexpected Boom"));
    
    await expect(orchestrator.run({ taskId: '1', mainStep: 'Sync' }, work))
      .rejects.toThrow("Unexpected Boom");

    expect(deps.updateTask.execute).toHaveBeenCalledWith(expect.objectContaining({
      status: 'FAILED',
      error: 'Unexpected Boom'
    }));
  });

  it('should call onCleanup in finally block', async () => {
    const onCleanup = vi.fn().mockResolvedValue(undefined);
    await orchestrator.run({ onCleanup, mainStep: 'Step' }, async () => {});
    expect(onCleanup).toHaveBeenCalled();
  });

  it('should support execution without taskId', async () => {
    const work = vi.fn().mockResolvedValue(undefined);
    await orchestrator.run({ mainStep: 'CLI_ONLY' }, work);
    
    expect(deps.updateTask.execute).not.toHaveBeenCalled();
    expect(work).toHaveBeenCalled();
  });
});
