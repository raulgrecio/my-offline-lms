import { describe, it, expect, vi, beforeEach } from 'vitest';
import { type ILogger } from '@core/logging';
import { CleanupInterruptedTasks } from '@scraper/features/task-management/application/CleanupInterruptedTasks';

describe('CleanupInterruptedTasks Use Case', () => {
  const mockTaskRepo = {
    findAll: vi.fn(),
    update: vi.fn(),
    save: vi.fn(),
    findById: vi.fn(),
    findActive: vi.fn(),
    delete: vi.fn(),
  };

  const mockLogger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    withContext: vi.fn().mockReturnThis(),
  } as unknown as ILogger;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should mark RUNNING tasks as FAILED', async () => {
    const tasks = [
      { id: '1', status: 'RUNNING', progress: { step: 'Step 1' } },
      { id: '2', status: 'COMPLETED', progress: { step: 'Done' } },
      { id: '3', status: 'RUNNING', progress: { step: 'Step 3' } },
    ];
    mockTaskRepo.findAll.mockResolvedValue(tasks);

    const useCase = new CleanupInterruptedTasks(mockTaskRepo as any, mockLogger);
    await useCase.execute();

    expect(mockTaskRepo.update).toHaveBeenCalledTimes(2);
    expect(mockTaskRepo.update).toHaveBeenCalledWith('1', expect.objectContaining({
      status: 'FAILED',
      progress: expect.objectContaining({ step: expect.stringContaining('interrumpido') })
    }));
    expect(mockTaskRepo.update).toHaveBeenCalledWith('3', expect.objectContaining({
      status: 'FAILED'
    }));
  });

  it('should do nothing if no tasks are RUNNING', async () => {
    mockTaskRepo.findAll.mockResolvedValue([
      { id: '1', status: 'COMPLETED' },
      { id: '2', status: 'CANCELLED' },
    ]);

    const useCase = new CleanupInterruptedTasks(mockTaskRepo as any, mockLogger);
    await useCase.execute();

    expect(mockTaskRepo.update).not.toHaveBeenCalled();
  });
});
