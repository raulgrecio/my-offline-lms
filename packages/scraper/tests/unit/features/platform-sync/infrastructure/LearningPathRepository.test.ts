import { describe, it, expect, beforeEach } from 'vitest';

import { SQLiteDatabase } from '@core/database';

import { SQLiteLearningPathRepository } from '@scraper/features/platform-sync';

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


    repo.saveLearningPath({ id: 'lp1', slug: 's2', title: 'T2', description: 'D2' });
    expect(repo.getLearningPathById('lp1')?.title).toBe('T2');
  });

  it('should get all learning paths ordered by title', () => {
    repo.saveLearningPath({ id: 'lp2', slug: 's2', title: 'B', description: '' });
    repo.saveLearningPath({ id: 'lp1', slug: 's1', title: 'A', description: '' });
    const all = repo.getAllLearningPaths();
    expect(all).toHaveLength(2);
    expect(all[0].title).toBe('A');
    expect(all[1].title).toBe('B');
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

    repo.addCourseToPath({ pathId: 'lp1', courseId: 'c1', orderIndex: 5 });
    expect(repo.getCoursesForPath('lp1')[0].orderIndex).toBe(5);
  });

  it('should return null if LP not found', () => {
    expect(repo.getLearningPathById('none')).toBeNull();
  });
});
