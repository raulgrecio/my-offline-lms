import { describe, it, expect } from 'vitest';
import { OraclePlatformUrlProvider } from '../../../infrastructure/services/OraclePlatformUrlProvider';

describe('OraclePlatformUrlProvider', () => {
    const provider = new OraclePlatformUrlProvider();

    describe('resolveCourseUrl', () => {
        it('should resolve a slug to a full URL with trailing slash', () => {
            const result = provider.resolveCourseUrl('my-course-slug');
            expect(result).toBe('https://mylearn.oracle.com/ou/course/slug/my-course-slug/');
        });

        it('should return a full URL as is, but ensuring trailing slash', () => {
            const url = 'https://mylearn.oracle.com/ou/course/slug/another-slug';
            const result = provider.resolveCourseUrl(url);
            expect(result).toBe(url + '/');
        });

        it('should not add a second trailing slash if one already exists', () => {
             const url = 'https://mylearn.oracle.com/ou/course/slug/fixed-slug/';
             const result = provider.resolveCourseUrl(url);
             expect(result).toBe(url);
        });
    });

    describe('resolveLearningPathUrl', () => {
        it('should resolve a numeric ID to a full path URL', () => {
            const result = provider.resolveLearningPathUrl('12345');
            expect(result).toBe('https://mylearn.oracle.com/ou/learning-path/path/12345');
        });

        it('should return a non-numeric string (like a full URL) as is', () => {
            const url = 'https://some-other-url.com/path';
            const result = provider.resolveLearningPathUrl(url);
            expect(result).toBe(url);
        });
    });

    describe('getCourseUrl', () => {
        it('should return a valid course URL from slug and id', () => {
            const result = provider.getCourseUrl('course-slug', '999');
            expect(result).toBe('https://mylearn.oracle.com/ou/course/course-slug/999');
        });
    });
});
