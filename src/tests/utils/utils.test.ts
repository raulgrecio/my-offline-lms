import { describe, it, expect } from 'vitest';
import { AssetNamingService } from '@domain/services/AssetNamingService';

describe('AssetNamingService', () => {
    const namingService = new AssetNamingService();

    describe('generateSafeFilename', () => {
        it('cleans non-alphanumeric characters', () => {
            expect(namingService.generateSafeFilename('Hello (World)! :123')).toBe('Hello_World_123');
        });

        it('adds index prefix formatted as two digits', () => {
            expect(namingService.generateSafeFilename('Video.Title', 1)).toBe('01_VideoTitle');
            expect(namingService.generateSafeFilename('Video Title!', 15)).toBe('15_Video_Title');
        });

        it('works correctly when index is missing or null', () => {
            expect(namingService.generateSafeFilename('My Video', null as any)).toBe('My_Video');
            expect(namingService.generateSafeFilename('My Video')).toBe('My_Video');
        });

        it('should generate a safe filename', () => {
            expect(namingService.generateSafeFilename('Hello (World)! :123')).toBe('Hello_World_123');
        });

        it('should prefix with order index if provided', () => {
            expect(namingService.generateSafeFilename('Video.Title', 1)).toBe('01_VideoTitle');
            expect(namingService.generateSafeFilename('Video Title!', 15)).toBe('15_Video_Title');
        });

        it('should work without order index', () => {
            expect(namingService.generateSafeFilename('My Video', null as any)).toBe('My_Video');
            expect(namingService.generateSafeFilename('My Video')).toBe('My_Video');
        });
    });

    describe('cleanUrl', () => {
        it('sanitizes double slashes without breaking the protocol', () => {
            const url = namingService.cleanUrl('https://example.com//path//to///resource');
            expect(url).toBe('https://example.com/path/to/resource');
        });

        it('handles empty urls gracefully', () => {
            expect(namingService.cleanUrl('')).toBe('');
        });

        it('should clean URLs correctly', () => {
            expect(namingService.cleanUrl('https://example.com//path//to///resource')).toBe('https://example.com/path/to/resource');
        });
    });

    describe('slugify', () => {
        it('removes accents and creates valid slugs', () => {
            expect(namingService.slugify('Atención y Configuración')).toBe('atencion-y-configuracion');
        });
        
        it('should slugify text correctly', () => {
            expect(namingService.slugify('Atención y Configuración')).toBe('atencion-y-configuracion');
        });
    });
});
