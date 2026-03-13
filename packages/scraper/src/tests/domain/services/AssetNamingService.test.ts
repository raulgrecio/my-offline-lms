import { describe, it, expect, beforeEach } from 'vitest';
import { AssetNamingService } from '@features/asset-download/infrastructure/AssetNamingService';
import { env } from '@config/env';

describe('AssetNamingService', () => {
  let service: AssetNamingService;

  beforeEach(() => {
    service = new AssetNamingService();
  });

  describe('slugify', () => {
    it('should convert strings to safe slugs', () => {
      expect(service.slugify('Hello World!')).toBe('hello-world');
      expect(service.slugify('Acción y Reacción')).toBe('accion-y-reaccion');
      expect(service.slugify('  Trim Me  ')).toBe('trim-me');
    });

    it('should return empty string for empty input', () => {
      expect(service.slugify('')).toBe('');
    });
  });

  describe('cleanUrl', () => {
    it('should collapse double slashes but preserve protocol', () => {
      expect(service.cleanUrl('https://example.com//path//to//resource')).toBe('https://example.com/path/to/resource');
    });

    it('should preserve single trailing slash if present', () => {
      expect(service.cleanUrl('https://example.com/path/')).toBe('https://example.com/path/');
    });
  });

  describe('generateSafeFilename', () => {
    it('should remove unsafe characters and replace spaces with underscores', () => {
      expect(service.generateSafeFilename('My Guide: Part 1?')).toBe('My_Guide_Part_1');
    });

    it('should add order index prefix if provided', () => {
      expect(service.generateSafeFilename('Introduction', 1)).toBe('01_Introduction');
      expect(service.generateSafeFilename('Advanced', '5')).toBe('05_Advanced');
    });

    it('should handle unnamed assets robustly', () => {
      expect(service.generateSafeFilename('')).toBe('unnamed_asset');
      // @ts-ignore
      expect(service.generateSafeFilename(null)).toBe('unnamed_asset');
    });
  });

  describe('extractOfferingId', () => {
    it('should extract offeringId from learning-path URLs', () => {
      const url = new URL('/api/eml-content/learning-path/35573/148510/userdata/', env.PLATFORM_BASE_URL).href;
      expect(service.extractOfferingId(url)).toBe('35573');
    });

    it('should extract offeringId from query parameters', () => {
      const url = new URL('/api/eml-content/courses/150265/metadata?offeringId=35644', env.PLATFORM_BASE_URL).href;
      expect(service.extractOfferingId(url)).toBe('35644');
    });

    it('should return null if no offeringId is found', () => {
      const url = new URL('/api/eml-content/random/url', env.PLATFORM_BASE_URL).href;
      expect(service.extractOfferingId(url)).toBeNull();
    });
  });

  describe('extractIdFromInput', () => {
    it('should return raw ID if no slashes are present', () => {
      expect(service.extractIdFromInput('148510')).toBe('148510');
    });

    it('should handle trailing slashes in IDs', () => {
      expect(service.extractIdFromInput('148510/ ')).toBe('148510');
    });

    it('should extract last segment from full URLs', () => {
      expect(service.extractIdFromInput(new URL('/path/148510', env.PLATFORM_BASE_URL).href)).toBe('148510');
      expect(service.extractIdFromInput(new URL('/path/148510/', env.PLATFORM_BASE_URL).href)).toBe('148510');
    });

    it('should cleanup malformed URLs before extracting', () => {
      expect(service.extractIdFromInput(new URL('//path//148510//', env.PLATFORM_BASE_URL).href)).toBe('148510');
    });
  });
});
