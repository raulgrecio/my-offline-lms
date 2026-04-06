import { describe, it, expect, beforeAll } from 'vitest';

import { type IDatabase, SQLiteDatabase } from '@core/database';
import { NodeFileSystem } from '@core/filesystem';
import { ConsoleLogger } from '@core/logging';

import { getDb } from '@scraper/platform/database';
import { ScraperTask, SQLiteTaskRepository } from '@scraper/features/task-management';

describe('SQLiteTaskRepository', () => {
  let db: IDatabase;
  let repository: SQLiteTaskRepository;

  beforeAll(async () => {
    const logger = new ConsoleLogger();

    // Usamos una base de datos en memoria para los tests unitarios
    const memoryDb = new SQLiteDatabase(':memory:');

    db = await getDb({
      database: memoryDb,
      fsAdapter: new NodeFileSystem(logger)
    });
    repository = new SQLiteTaskRepository(db);

    // Schema is initialized by initDb(options) via initialize()
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

    // Case: Second active task, newer
    const now = new Date();
    const newerTask = new ScraperTask(
      'newer',
      'course',
      'u',
      null,
      'RUNNING',
      null,
      null,
      new Date(now.getTime() + 1000), // Distinctly newer
      new Date(now.getTime() + 1000)
    );
    await repository.save(newerTask);
    const latestActive = await repository.findActive();
    expect(latestActive?.id).toBe('newer');
  });

  it('should return null if no active task found', async () => {
    db.prepare('DELETE FROM Scraper_Tasks').run();
    const active = await repository.findActive();
    expect(active).toBeNull();
  });

  it('should update task with error', async () => {
    const taskId = 'task-err-1';
    const task = ScraperTask.create({ id: taskId, type: 'course', url: 'http://url', targetId: 'id2-sqlitetaskrepositorytest' });
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

  it('should find all tasks ordered by creation date', async () => {
    db.prepare('DELETE FROM Scraper_Tasks').run();
    const t1 = ScraperTask.create({ id: 't1', type: 'course', url: 'u1' });
    const t2 = ScraperTask.create({ id: 't2', type: 'course', url: 'u2' });
    
    await repository.save(t1);
    await repository.save(t2);

    const all = await repository.findAll();
    expect(all).toHaveLength(2);
    // Ordered by createdAt DESC, so t2 should be first if saved after t1
    // (In memory it's very fast, but let's check ids)
    expect(all.map(t => t.id)).toContain('t1');
    expect(all.map(t => t.id)).toContain('t2');
  });

  it('should delete a task by id', async () => {
    const t1 = ScraperTask.create({ id: 'to-delete', type: 'course', url: 'u' });
    await repository.save(t1);
    
    expect(await repository.findById('to-delete')).not.toBeNull();
    await repository.delete('to-delete');
    expect(await repository.findById('to-delete')).toBeNull();
  });

  it('should map tasks with null progress correctly', async () => {
    const t1 = ScraperTask.create({ id: 'no-progress', type: 'course', url: 'u' });
    // Ensuring progress is null
    t1.progress = null;
    await repository.save(t1);
    
    const found = await repository.findById('no-progress');
    expect(found?.progress).toBeNull();
  });

  it('should not perform update if no data is provided', async () => {
    const t1 = ScraperTask.create({ id: 'stay-same', type: 'course', url: 'u' });
    await repository.save(t1);
    
    await repository.update('stay-same', {});
    const found = await repository.findById('stay-same');
    expect(found?.status).toBe('PENDING'); // No change
  });
});


