import { describe, it, expect, beforeEach } from 'vitest';

import { SQLiteDatabase } from '@core/database';

import { SQLiteCourseRepository } from '@scraper/features/platform-sync/infrastructure/CourseRepository';

describe('SQLiteCourseRepository', () => {
  let db: SQLiteDatabase;
  let repo: SQLiteCourseRepository;

  beforeEach(() => {
    db = new SQLiteDatabase(':memory:');
    db.initialize();
    repo = new SQLiteCourseRepository(db);
  });

  it('should save and get course', () => {
    repo.saveCourse({ id: 'c1', slug: 's1', title: 'T1' });
    const course = repo.getCourseById('c1');
    expect(course).toEqual({ id: 'c1', slug: 's1', title: 'T1' });
  });

  it('should update course on conflict', () => {
    repo.saveCourse({ id: 'c1', slug: 's1', title: 'T1' });
    repo.saveCourse({ id: 'c1', slug: 's2', title: 'T2' });
    expect(repo.getCourseById('c1')).toEqual({ id: 'c1', slug: 's2', title: 'T2' });
  });

  it('should get course assets', () => {
    db.prepare("INSERT INTO Courses (id, title) VALUES ('c1', 'T1')").run();
    db.prepare("INSERT INTO Course_Assets (id, course_id, type) VALUES ('a1', 'c1', 'video')").run();
    const assets = repo.getCourseAssets('c1');
    expect(assets).toHaveLength(1);
    expect(assets[0].id).toBe('a1');
  });

  it('should return null if course not found', () => {
    expect(repo.getCourseById('none')).toBeNull();
  });
});
