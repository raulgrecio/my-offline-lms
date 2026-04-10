import { describe, it, expect, vi } from 'vitest';

import { generateId } from '@core/domain';

import { CreateTask } from '@scraper/features/task-management/application/CreateTask';
import { UpdateTask } from '@scraper/features/task-management/application/UpdateTask';
import { GetActiveTask } from '@scraper/features/task-management/application/GetActiveTask';
import { CancelTask } from '@scraper/features/task-management/application/CancelTask';
import { GetTaskById } from '@scraper/features/task-management/application/GetTaskById';
import { StartTask } from '@scraper/features/task-management/application/StartTask';
import { DeleteTask } from '@scraper/features/task-management/application/DeleteTask';
import { GetAllTasks } from '@scraper/features/task-management/application/GetAllTasks';
import { ScraperTask } from '@scraper/features/task-management/domain/models/ScraperTask';
import type { ITaskRepository } from '@scraper/features/task-management/domain/ports/ITaskRepository';

const mockRepo = (): ITaskRepository => ({
  save: vi.fn(),
  update: vi.fn(),
  findById: vi.fn(),
  findActive: vi.fn(),
  findAll: vi.fn(),
  delete: vi.fn(),
});

describe('Task Management Use Cases', () => {
  describe('CreateTask', () => {
    it('should save a new task into the repository', async () => {
      const repo = mockRepo();
      const useCase = new CreateTask(repo);
      const id = generateId();
      const input = { id, type: 'course' as any, action: 'SYNC_COURSE' as any, url: 'https://test.com', targetId: '123' };

      const taskId = await useCase.execute(input);

      expect(taskId).toBe(id);
      expect(repo.save).toHaveBeenCalled();
      const savedTask = (repo.save as any).mock.calls[0][0];
      expect(savedTask.id).toBe(id);
      expect(savedTask.status).toBe('PENDING');
    });
  });

  describe('UpdateTask', () => {
    it('should update task data in the repository', async () => {
      const repo = mockRepo();
      const useCase = new UpdateTask(repo);
      const input = { id: 'task-1', status: 'COMPLETED' as any, progress: { step: 'done' } };

      await useCase.execute(input);

      const { id, ...data } = input;
      expect(repo.update).toHaveBeenCalledWith('task-1', data);
    });
  });

  describe('GetActiveTask', () => {
    it('should retrieve the active task from the repository', async () => {
      const repo = mockRepo();
      const useCase = new GetActiveTask(repo);
      const activeTask = ScraperTask.create({ id: 'active', type: 'course', action: 'SYNC_COURSE', url: '...' });
      (repo.findActive as any).mockResolvedValue(activeTask);

      const result = await useCase.execute();

      expect(result).toBe(activeTask);
      expect(repo.findActive).toHaveBeenCalled();
    });

    it('should return undefined if no active task is found', async () => {
      const repo = mockRepo();
      const useCase = new GetActiveTask(repo);
      (repo.findActive as any).mockResolvedValue(undefined);

      const result = await useCase.execute();

      expect(result).toBeUndefined();
    });
  });

  describe('GetAllTasks', () => {
    it('should retrieve all tasks from the repository', async () => {
      const repo = mockRepo();
      const useCase = new GetAllTasks(repo);
      (repo.findAll as any).mockResolvedValue([]);

      const result = await useCase.execute();

      expect(result).toEqual([]);
      expect(repo.findAll).toHaveBeenCalled();
    });
  });

  describe('DeleteTask', () => {
    it('should remove a task from the repository', async () => {
      const repo = mockRepo();
      const useCase = new DeleteTask(repo);

      await useCase.execute({ id: 'task-1' });

      expect(repo.delete).toHaveBeenCalledWith('task-1');
    });
  });

  describe('CancelTask', () => {
    it('should set the task status to CANCELLED', async () => {
      const repo = mockRepo();
      const useCase = new CancelTask(repo);

      await useCase.execute({ id: 'task-1' });

      expect(repo.update).toHaveBeenCalledWith('task-1', { status: 'CANCELLED' });
    });
  });

  describe('GetTaskById', () => {
    it('should find a task by its ID', async () => {
      const repo = mockRepo();
      const useCase = new GetTaskById(repo);
      const task = ScraperTask.create({ id: 'task-1', type: 'course', action: 'SYNC_COURSE', url: '...' });
      (repo.findById as any).mockResolvedValue(task);

      const result = await useCase.execute({ id: 'task-1' });

      expect(result).toBe(task);
      expect(repo.findById).toHaveBeenCalledWith('task-1');
    });
  });

  describe('StartTask', () => {
    it('should transition a PENDING task to RUNNING', async () => {
      const repo = mockRepo();
      const useCase = new StartTask(repo);
      const task = ScraperTask.create({ id: 'task-1', type: 'course', action: 'SYNC_COURSE', url: 'https://test.com' });
      (repo.findById as any).mockResolvedValue(task);

      await useCase.execute({ id: 'task-1' });

      expect(task.status).toBe('RUNNING');
      expect(task.progress?.step).toBe('Iniciando proceso...');
      expect(repo.update).toHaveBeenCalledWith(task.id, { status: 'RUNNING', progress: task.progress });
    });

    it('should transition a task without progress to RUNNING', async () => {
      const repo = mockRepo();
      const useCase = new StartTask(repo);
      const task = ScraperTask.create({ id: 'task-no-progress', type: 'course', action: 'SYNC_COURSE', url: 'https://test.com' });
      // Reset progress to null manually if ScraperTask.create sets it
      (task as any).progress = null;
      (repo.findById as any).mockResolvedValue(task);

      await useCase.execute({ id: 'task-no-progress' });

      expect(repo.update).toHaveBeenCalledWith('task-no-progress', { 
        status: 'RUNNING', 
        progress: { step: 'Iniciando proceso...' } 
      });
    });

    it('should throw error if task not found', async () => {
      const repo = mockRepo();
      const useCase = new StartTask(repo);
      (repo.findById as any).mockResolvedValue(null);

      await expect(useCase.execute({ id: 'invalid' })).rejects.toThrow('Task with id invalid not found');
    });
  });
});
