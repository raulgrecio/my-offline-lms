import { describe, it, expect } from 'vitest';
import { ScraperTask } from '@scraper/features/task-management';
import { generateId } from '@core/domain';

describe('ScraperTask', () => {
  it('should create a new task with provided values', () => {
    const id = generateId();
    const type = 'course';
    const url = 'https://example.com/course';
    const targetId = 'course-1';

    const task = ScraperTask.create({ id, type, action: 'SYNC_COURSE', url, targetId });

    expect(task.id).toBe(id);
    expect(task.type).toBe(type);
    expect(task.url).toBe(url);
    expect(task.targetId).toBe(targetId);
    expect(task.status).toBe('PENDING');
    expect(task.progress).toBeNull();
    expect(task.error).toBeNull();
    expect(task.createdAt).toBeInstanceOf(Date);
    expect(task.updatedAt).toBeInstanceOf(Date);
  });

  describe('start', () => {
    it('should transition to RUNNING state when started', () => {
      const id = generateId();
      const task = ScraperTask.create({
        id,
        type: 'course',
        action: 'SYNC_COURSE',
        url: 'https://example.com/course'
      });

      task.start();

      expect(task.status).toBe('RUNNING');
      expect(task.progress?.step).toBe('Iniciando proceso...');
      expect(task.updatedAt).toBeInstanceOf(Date);
    });
  });
});
