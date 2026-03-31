import { describe, it, expect, beforeEach } from 'vitest';

import { SQLiteDatabase } from '@core/database';

import { SQLiteLearningPathRepository } from '@scraper/features/platform-sync/infrastructure/LearningPathRepository';

describe('SQLiteLearningPathRepository', () => {
  let db: SQLiteDatabase;
  let repo: SQLiteLearningPathRepository;

  beforeEach(() => {
    db = new SQLiteDatabase(':memory:');
    db.initialize();
    repo = new SQLiteLearningPathRepository(db);
  });

  it('should save and get learning path', () => {
    repo.saveLearningPath({ id: 'lp1', slug: 's1', title: 'T1', description: 'D1' });
    const lp = repo.getLearningPathById('lp1');
    expect(lp).toEqual({ id: 'lp1', slug: 's1', title: 'T1', description: 'D1' });
  });

  it('should add courses to path and retrieve them', () => {
    // Satisfy FKs
    db.prepare("INSERT INTO LearningPaths (id, title) VALUES ('lp1', 'LP1')").run();
    db.prepare("INSERT INTO Courses (id, title) VALUES ('c1', 'C1')").run();

    repo.addCourseToPath({ pathId: 'lp1', courseId: 'c1', orderIndex: 1 });

    const courses = repo.getCoursesForPath('lp1');
    expect(courses).toHaveLength(1);
    expect(courses[0].id).toBe('c1');
    expect(courses[0].orderIndex).toBe(1);
  });

  it('should return null if LP not found', () => {
    expect(repo.getLearningPathById('none')).toBeNull();
  });
});
