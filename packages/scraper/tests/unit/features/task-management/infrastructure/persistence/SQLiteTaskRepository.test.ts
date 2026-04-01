import { describe, it, expect, beforeAll } from 'vitest';

import { type IDatabase } from '@core/database';
import { NodeFileSystem } from '@core/filesystem';
import { ConsoleLogger } from '@core/logging';

import { getDb } from '@scraper/platform/database';
import { ScraperTask } from '@scraper/features/task-management/domain/models/ScraperTask';
import { SQLiteTaskRepository } from '@scraper/features/task-management/infrastructure/persistence/SQLiteTaskRepository';

describe('SQLiteTaskRepository', () => {
  let db: IDatabase;
  let repository: SQLiteTaskRepository;

  beforeAll(async () => {
    const logger = new ConsoleLogger();
    db = await getDb({ fsAdapter: new NodeFileSystem(logger) });
    repository = new SQLiteTaskRepository(db);

    // Ensure table exists and is empty
    db.prepare('DELETE FROM Scraper_Tasks').run();
  });

  it('should save and find a task by id', async () => {
    const task = ScraperTask.create({
      id: 'test-task-1',
      type: 'course',
      url: 'https://test.com/course',
      targetId: 'course-123'
    });

    try {
      await repository.save(task);
    } catch (e: any) {
      console.error('SQL Error during save:', e.message);
      throw e;
    }

    const found = await repository.findById(task.id);
    expect(found).not.toBeNull();
    expect(found?.id).toBe(task.id);
    expect(found?.type).toBe(task.type);
    expect(found?.url).toBe(task.url);
  });

  it('should update task status and progress', async () => {
    const taskId = 'test-task-2';
    const task = ScraperTask.create({
      id: taskId,
      type: 'course',
      url: 'https://test.com/course'
    });
    await repository.save(task);

    const progress = { step: 'Downloading', percent: 50 };
    await repository.update(taskId, {
      status: 'RUNNING',
      progress: progress
    });

    const updated = await repository.findById(taskId);
    expect(updated?.status).toBe('RUNNING');
    expect(updated?.progress).toEqual(progress);
  });

  it('should find the last active task', async () => {
    const taskId = 'active-task';
    const task = ScraperTask.create({
      id: taskId,
      type: 'course',
      url: 'https://test.com/course'
    });
    task.status = 'RUNNING';
    await repository.save(task);

    const active = await repository.findActive();
    expect(active).not.toBeNull();
    expect(active?.id).toBe(taskId);
    expect(active?.status).toBe('RUNNING');
  });

  it('should return null if no active task found', async () => {
    db.prepare('DELETE FROM Scraper_Tasks').run();
    const active = await repository.findActive();
    expect(active).toBeNull();
  });

  it('should update task with error', async () => {
    const taskId = 'task-err-1';
    const task = ScraperTask.create({ id: taskId, type: 'course', url: 'http://url', targetId: 'id1' });
    await repository.save(task);

    await repository.update(taskId, { status: 'FAILED', error: 'Test Error' });
    const found = await repository.findById(taskId);
    expect(found?.status).toBe('FAILED');
    expect(found?.error).toBe('Test Error');
  });

  it('should return null if task not found', async () => {
    const found = await repository.findById('non-existent');
    expect(found).toBeNull();
  });
});
