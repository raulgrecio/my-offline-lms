import { describe, it, expect } from 'vitest';

import { env } from '@scraper/config/env';
import { OraclePlatformUrlProvider } from '@scraper/features/platform-sync';

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
    it('should resolve a numeric ID to a full path URL and extract pathId', () => {
      const result = provider.resolveLearningPathUrl('12345');
      expect(result).toEqual({
        url: new URL('ou/learning-path/path/12345/', env.PLATFORM_BASE_URL).href,
        pathId: '12345'
      });
    });

    it('should extract pathId from a full learning path URL', () => {
      const url = new URL('ou/learning-path/some-slug/148510', env.PLATFORM_BASE_URL).href;
      const result = provider.resolveLearningPathUrl(url);
      expect(result).toEqual({
        url: url + '/',
        pathId: '148510'
      });
    });

    it('should resolve relative learning path URL', () => {
      const rel = 'ou/learning-path/slug/123';
      const result = provider.resolveLearningPathUrl(rel);
      expect(result.url).toBe(new URL(rel + '/', env.PLATFORM_BASE_URL).href);
    });

    it('should handle learning path URL that already ends with slash', () => {
      const url = new URL('ou/learning-path/slug/123/', env.PLATFORM_BASE_URL).href;
      const result = provider.resolveLearningPathUrl(url);
      expect(result.url).toBe(url);
    });

    it('should throw an error if pathId cannot be extracted', () => {
      expect(() => provider.resolveLearningPathUrl('malformed-url')).toThrow('No se pudo extraer el ID del learning path');
    });
  });

  describe('getCourseUrl', () => {
    it('should return a valid course URL from slug and id', () => {
      const result = provider.getCourseUrl({ slug: 'course-slug', id: '999' });
      expect(result).toBe(new URL('ou/course/course-slug/999', env.PLATFORM_BASE_URL).href);
    });

    it('should use "path" as default slug if empty', () => {
      const result = provider.getCourseUrl({ slug: '', id: '999' });
      expect(result).toContain('/path/999');
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
      expect(result).toBe('https://some-cdn.com/files/mobile/');
    });

    it('should handle already slashed guide image base url', () => {
      const iframeSrc = 'https://some-cdn.com/mobile/index.html';
      const result = provider.getGuideImageBaseUrl(iframeSrc);
      expect(result.endsWith('/')).toBe(true);
    });

    it('should handle source that does not match replacement regex and ensure trailing slash', () => {
      const iframeSrc = 'https://other.com/viewer.html';
      const result = provider.getGuideImageBaseUrl(iframeSrc);
      expect(result).toBe('https://other.com/viewer.html/');
    });
  });
});
