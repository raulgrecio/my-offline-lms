import { describe, it, expect } from 'vitest';
import { AssetNamingService } from '../../domain/services/AssetNamingService';
import { PlatformUrl } from '../../domain/value-objects/PlatformUrl';
import { Slug } from '../../domain/value-objects/Slug';

describe('AssetNamingService', () => {
    it('cleans non-alphanumeric characters', () => {
        expect(AssetNamingService.generateSafeFilename('Hello (World)! :123')).toBe('Hello_World_123');
    });

    it('adds index prefix formatted as two digits', () => {
        expect(AssetNamingService.generateSafeFilename('Video.Title', 1)).toBe('01_VideoTitle');
        expect(AssetNamingService.generateSafeFilename('Video Title!', 15)).toBe('15_Video_Title');
    });

    it('works correctly when index is missing or null', () => {
        expect(AssetNamingService.generateSafeFilename('My Video', null as any)).toBe('My_Video');
        expect(AssetNamingService.generateSafeFilename('My Video')).toBe('My_Video');
    });
});

describe('PlatformUrl Value Object', () => {
    it('sanitizes double slashes without breaking the protocol', () => {
        const url = PlatformUrl.create('https://example.com//path//to///resource');
        expect(url.getValue()).toBe('https://example.com/path/to/resource');
    });

    it('handles empty urls gracefully', () => {
        expect(PlatformUrl.create('').getValue()).toBe('');
    });
});

describe('Slug Value Object', () => {
    it('removes accents and creates valid slugs', () => {
        expect(Slug.create('Atención y Configuración').getValue()).toBe('atencion-y-configuracion');
    });
});
