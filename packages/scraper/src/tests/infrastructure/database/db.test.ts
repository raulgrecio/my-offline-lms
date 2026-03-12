import { describe, it, expect, beforeAll } from 'vitest';
import { db, initDb } from '@db/schema';

describe('Database Baseline', () => {
    beforeAll(() => {
        initDb();
    });

    it('should be able to insert and retrieve a course', () => {
        const courseId = 'test-course-123';
        
        // Clear if exists
        db.prepare('DELETE FROM Courses WHERE id = ?').run(courseId);

        db.prepare(`
            INSERT INTO Courses (id, slug, title) 
            VALUES (@id, @slug, @title)
        `).run({
            id: courseId,
            slug: 'test-course-slug',
            title: 'My Test Course'
        });

        const row = db.prepare('SELECT id, title FROM Courses WHERE id = ?').get(courseId) as any;
        expect(row.id).toBe(courseId);
        expect(row.title).toBe('My Test Course');

        // Cleanup
        db.prepare('DELETE FROM Courses WHERE id = ?').run(courseId);
    });
});
