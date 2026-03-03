import { describe, it, expect } from 'vitest';
import { getAssetFilename } from '../../utils/naming';
import { sanitizeUrl } from '../../utils/url';

describe('Naming Utility', () => {
    it('cleans non-alphanumeric characters', () => {
        expect(getAssetFilename('Hello (World)! :123')).toBe('Hello_World_123');
    });

    it('adds index prefix formatted as two digits', () => {
        expect(getAssetFilename('Video.Title', { index: 1 })).toBe('01_VideoTitle');
        expect(getAssetFilename('Video Title!', { index: 15 })).toBe('15_Video_Title');
    });

    it('works correctly when index is missing or null', () => {
        expect(getAssetFilename('My Video', { index: null })).toBe('My_Video');
        expect(getAssetFilename('My Video')).toBe('My_Video');
    });
});

describe('URL Utility', () => {
    it('sanitizes double slashes without breaking the protocol', () => {
        expect(sanitizeUrl('https://example.com//path//to///resource'))
            .toBe('https://example.com/path/to/resource');
    });

    it('handles empty urls gracefully', () => {
        expect(sanitizeUrl('')).toBe('');
    });
});
