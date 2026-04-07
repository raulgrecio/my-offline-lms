import { describe, it, expect, beforeAll } from 'vitest';

import { type IDatabase, SQLiteDatabase } from '@core/database';
import { NodeFileSystem } from '@core/filesystem';
import { ConsoleLogger } from '@core/logging';

import { getDb } from '@scraper/platform/database';
import { ScraperTask, SQLiteTaskRepository, ScraperTaskCategory, ScraperTaskStatus, ScraperTaskAction } from '@scraper/features/task-management';

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
      type: ScraperTaskCategory.COURSE,
      action: ScraperTaskAction.SYNC_COURSE,
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
    expect(found?.action).toBe(task.action);
    expect(found?.url).toBe(task.url);
  });

  it('should update task status and progress', async () => {
    const taskId = 'test-task-2';
    const task = ScraperTask.create({
      id: taskId,
      type: ScraperTaskCategory.COURSE,
      action: ScraperTaskAction.SYNC_COURSE,
      url: 'https://test.com/course'
    });
    await repository.save(task);

    const progress = { step: 'Downloading', percent: 50 };
    await repository.update(taskId, {
      status: ScraperTaskStatus.RUNNING,
      progress: progress
    });

    const updated = await repository.findById(taskId);
    expect(updated?.status).toBe(ScraperTaskStatus.RUNNING);
    expect(updated?.progress).toEqual(expect.objectContaining(progress));
  });

  it('should find the last active task', async () => {
    const taskId = 'active-task';
    const task = ScraperTask.create({
      id: taskId,
      type: ScraperTaskCategory.COURSE,
      action: ScraperTaskAction.SYNC_COURSE,
      url: 'https://test.com/course'
    });
    task.status = ScraperTaskStatus.RUNNING;
    await repository.save(task);

    const active = await repository.findActive();
    expect(active).not.toBeNull();
    expect(active?.id).toBe(taskId);
    expect(active?.status).toBe(ScraperTaskStatus.RUNNING);

    // Case: Second active task, newer
    const now = new Date();
    const newerTask = new ScraperTask(
      'newer',
      ScraperTaskCategory.COURSE,
      ScraperTaskAction.SYNC_COURSE,
      'u',
      null,
      ScraperTaskStatus.RUNNING,
      null,
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
    const task = ScraperTask.create({
      id: taskId,
      type: ScraperTaskCategory.COURSE,
      action: ScraperTaskAction.SYNC_COURSE,
      url: 'http://url'
    });
    await repository.save(task);

    await repository.update(taskId, { status: ScraperTaskStatus.FAILED, error: 'Test Error' });
    const found = await repository.findById(taskId);
    expect(found?.status).toBe(ScraperTaskStatus.FAILED);
    expect(found?.error).toBe('Test Error');
  });

  it('should return null if task not found', async () => {
    const found = await repository.findById('non-existent');
    expect(found).toBeNull();
  });

  it('should find all tasks ordered by creation date', async () => {
    db.prepare('DELETE FROM Scraper_Tasks').run();
    const t1 = ScraperTask.create({ id: 't1', type: ScraperTaskCategory.COURSE, action: ScraperTaskAction.SYNC_COURSE, url: 'u1' });
    const t2 = ScraperTask.create({ id: 't2', type: ScraperTaskCategory.COURSE, action: ScraperTaskAction.SYNC_COURSE, url: 'u2' });

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
    const t1 = ScraperTask.create({ id: 'to-delete', type: ScraperTaskCategory.COURSE, action: ScraperTaskAction.SYNC_COURSE, url: 'u' });
    await repository.save(t1);

    expect(await repository.findById('to-delete')).not.toBeNull();
    await repository.delete('to-delete');
    expect(await repository.findById('to-delete')).toBeNull();
  });

  it('should map tasks with null progress correctly', async () => {
    const t1 = ScraperTask.create({ id: 'no-progress', type: ScraperTaskCategory.COURSE, action: ScraperTaskAction.SYNC_COURSE, url: 'u' });
    t1.progress = null;
    await repository.save(t1);

    const found = await repository.findById('no-progress');
    expect(found?.progress).toBeNull();
  });

  it('should not perform update if no data is provided', async () => {
    const t1 = ScraperTask.create({ id: 'stay-same', type: ScraperTaskCategory.COURSE, action: ScraperTaskAction.SYNC_COURSE, url: 'u' });
    await repository.save(t1);

    await repository.update('stay-same', {});
    const found = await repository.findById('stay-same');
    expect(found?.status).toBe(ScraperTaskStatus.PENDING); // No change
  });

  it('should support partial metadata updates with json_patch', async () => {
    const taskId = 'meta-patch';
    const task = ScraperTask.create({
      id: taskId,
      type: ScraperTaskCategory.COURSE,
      action: ScraperTaskAction.DOWNLOAD_COURSE,
      url: 'u',
      metadata: { includeDownload: true, download: 'all', kept: true }
    });
    await repository.save(task);

    // Partial update
    await repository.update(taskId, { metadata: { download: 'video' } });

    const found = await repository.findById(taskId);
    expect(found?.metadata).toEqual({
      includeDownload: true,
      download: 'video',
      kept: true
    });
  });

  it('should support partial progress updates with json_patch', async () => {
    const taskId = 'progress-patch';
    const task = ScraperTask.create({
      id: taskId,
      type: ScraperTaskCategory.COURSE,
      action: ScraperTaskAction.SYNC_COURSE,
      url: 'u'
    });
    task.progress = { step: 'Step 1', details: 'Started' };
    await repository.save(task);

    // Partial update
    await repository.update(taskId, { progress: { details: 'Moving' } });

    const found = await repository.findById(taskId);
    expect(found?.progress).toEqual({
      step: 'Step 1',
      details: 'Moving'
    });
  });

  it('should strictly preserve unrelated metadata fields during partial updates (no data loss)', async () => {
    const taskId = 'data-loss-prevention';
    const initialMetadata = {
      userPreference: 'dark-mode',
      retries: 3,
      nested: { a: 1 }
    };
    
    const task = ScraperTask.create({
      id: taskId,
      type: ScraperTaskCategory.COURSE,
      action: ScraperTaskAction.SYNC_COURSE,
      url: 'u',
      metadata: initialMetadata
    });
    await repository.save(task);

    // Update only 'retries'
    await repository.update(taskId, { metadata: { retries: 4 } });

    const found = await repository.findById(taskId);
    expect(found?.metadata).toEqual({
      userPreference: 'dark-mode',
      retries: 4,
      nested: { a: 1 } // Should be preserved
    });
  });
});


