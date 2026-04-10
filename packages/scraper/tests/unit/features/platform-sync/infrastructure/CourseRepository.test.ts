import { describe, it, expect, beforeEach } from 'vitest';

import { SQLiteDatabase } from '@core/database';

import { SQLiteCourseRepository } from '@scraper/features/platform-sync';

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
    expect(assets[0].metadata).toEqual({});

    db.prepare("INSERT INTO Course_Assets (id, course_id, metadata) VALUES ('a2', 'c1', '{\"foo\":1}')").run();
    expect(repo.getCourseAssets('c1')[1].metadata).toEqual({ foo: 1 });
  });

  it('should get courses with full sync status', () => {
    repo.saveCourse({ id: 'C1', title: 'A_Course', slug: 's1' });
    repo.saveCourse({ id: 'C2', title: 'B_Course', slug: 's2' });

    // C1: 1 video downloaded, 1 video pending, 1 guide downloaded
    db.prepare("INSERT INTO Course_Assets (id, course_id, type, local_path) VALUES ('v1', 'C1', 'video', '/p')").run();
    db.prepare("INSERT INTO Course_Assets (id, course_id, type) VALUES ('v2', 'C1', 'video')").run();
    db.prepare("INSERT INTO Course_Assets (id, course_id, type, local_path) VALUES ('g1', 'C1', 'guide', '/p')").run();

    const status = repo.getCoursesWithSyncStatus();
    expect(status).toHaveLength(2);
    expect(status[0].id).toBe('C1');
    expect(status[0].totalAssets).toBe(3);
    expect(status[0].downloadedAssets).toBe(2);
    expect(status[0].totalVideos).toBe(2);
    expect(status[0].downloadedVideos).toBe(1);
    expect(status[0].totalGuides).toBe(1);
    expect(status[0].downloadedGuides).toBe(1);
  });

  it('should return null if course not found', () => {
    expect(repo.getCourseById('none')).toBeNull();
  });
});
