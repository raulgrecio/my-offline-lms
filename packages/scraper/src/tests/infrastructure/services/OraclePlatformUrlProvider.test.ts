import { describe, it, expect } from 'vitest';
import { OraclePlatformUrlProvider } from '@infrastructure/services/OraclePlatformUrlProvider';
import { env } from '@config/env';

describe('OraclePlatformUrlProvider', () => {
    const provider = new OraclePlatformUrlProvider();

    describe('resolveCourseUrl', () => {
        it('should resolve a numeric ID to a full URL and extract courseId', () => {
            const result = provider.resolveCourseUrl('150265');
            expect(result).toEqual({
                url: new URL('ou/course/path/150265/', env.PLATFORM_BASE_URL).href,
                courseId: '150265'
            });
        });

        it('should resolve a relative path and extract courseId', () => {
            const result = provider.resolveCourseUrl('ou/course/oracle-data-platform/150265');
            expect(result).toEqual({
                url: new URL('ou/course/oracle-data-platform/150265/', env.PLATFORM_BASE_URL).href,
                courseId: '150265'
            });
        });

        it('should return a full URL and extract courseId', () => {
            const url = new URL('ou/course/slug/123456', env.PLATFORM_BASE_URL).href;
            const result = provider.resolveCourseUrl(url);
            expect(result).toEqual({
                url: url + '/',
                courseId: '123456'
            });
        });

        it('should throw an error if courseId cannot be extracted', () => {
            expect(() => provider.resolveCourseUrl('malformed-url-without-id')).toThrow('No se pudo extraer el ID del curso');
        });

        it('should not add a second trailing slash if one already exists', () => {
             const url = new URL('ou/course/slug/123/', env.PLATFORM_BASE_URL).href;
             const result = provider.resolveCourseUrl(url);
             expect(result.url).toBe(url);
        });
    });

    describe('resolveLearningPathUrl', () => {
        it('should resolve a numeric ID to a full path URL', () => {
            const result = provider.resolveLearningPathUrl('12345');
            expect(result).toBe(new URL('ou/learning-path/path/12345', env.PLATFORM_BASE_URL).href);
        });

        it('should return a non-numeric string (like a full URL) as is', () => {
            const url = new URL('https://some-other-url.com/path').href;
            const result = provider.resolveLearningPathUrl(url);
            expect(result).toBe(url);
        });
    });

    describe('getCourseUrl', () => {
        it('should return a valid course URL from slug and id', () => {
            const result = provider.getCourseUrl({ slug: 'course-slug', id: '999' });
            expect(result).toBe(new URL('ou/course/course-slug/999', env.PLATFORM_BASE_URL).href);
        });
    });

    describe('getGuideViewerUrl', () => {
        it('should return a valid guide viewer URL using template', () => {
            const result = provider.getGuideViewerUrl({ courseId: 'c1', offeringId: 'o1', ekitId: 'e1' });
            expect(result).toBe(new URL('ekit/c1/o1/e1/course', env.PLATFORM_BASE_URL).href);
        });
    });

    describe('getVideoAssetUrl', () => {
        it('should return a valid video asset URL by appending id to course url', () => {
            const courseUrl = new URL('ou/course/slug/123/', env.PLATFORM_BASE_URL).href;
            const result = provider.getVideoAssetUrl({ courseUrl, assetId: 'v1' });
            expect(result).toBe(courseUrl + 'v1');
        });

        it('should ensure trailing slash on course url before appending video id', () => {
            const courseUrl = new URL('ou/course/slug/123', env.PLATFORM_BASE_URL).href;
            const result = provider.getVideoAssetUrl({ courseUrl, assetId: 'v1' });
            expect(result).toBe(courseUrl + '/v1');
        });
    });

    describe('getGuideImageBaseUrl', () => {
        it('should replace flipbook suffix and ensure trailing slash', () => {
            const iframeSrc = 'https://some-cdn.com/mobile/index.html';
            const result = provider.getGuideImageBaseUrl(iframeSrc);
            // Replace /mobile/index.html with /files/mobile/
            expect(result).toBe('https://some-cdn.com/files/mobile/');
        });

        it('should handle query parameters in iframe src', () => {
            const iframeSrc = 'https://some-cdn.com/mobile/index.html?v=123';
            const result = provider.getGuideImageBaseUrl(iframeSrc);
            expect(result).toBe('https://some-cdn.com/files/mobile/');
        });
    });
});
