import { describe, it, expect, vi } from 'vitest';

import { AssetPathResolver } from '@my-offline-lms/core';

import { verifyAssetFiles } from '../../scripts/helpers/verifyAssetFiles';

// Mock dependencies
vi.mock('@my-offline-lms/core', async (importOriginal) => {
    const actual = await importOriginal<any>();
    return {
        ...actual,
        AssetPathResolver: class {
            ensureInitialized = vi.fn(async () => {});
            findAsset = vi.fn(async (courseId: string, type: string, filename: string) => {
                if (filename === 'custom-name.pdf') return '/path/to/custom-name.pdf';
                if (filename === 'custom-name.mp4') return '/path/to/custom-name.mp4';
                return null;
            });
            getDefaultWritePath = vi.fn(async () => '/default/path');
            listAssets = vi.fn(async () => []);
        },
        ASSET_FOLDERS: {
            guide: 'guides',
            video: 'videos',
        }
    };
});

vi.mock('../../infrastructure/adapters/NodeFileSystem', () => {
    return {
        NodeFileSystem: vi.fn().mockImplementation(() => {
            return {
                existsSync: vi.fn(() => true),
                readFileSync: vi.fn(() => '{}'),
                resolve: vi.fn((...args) => args.join('/')),
                join: vi.fn((...args) => args.join('/')),
                sep: '/',
            };
        })
    };
});

// Mock fs directly for global calls
vi.mock('fs', () => ({
    default: {
        existsSync: vi.fn(() => false), // Default to false for logic tests
        readdirSync: vi.fn(() => []),
    }
}));

describe('verifyAssetFiles', () => {
    const courseId = 'course-123';

    it('should prioritize meta.filename for guides', async () => {
        const metadata = JSON.stringify({
            name: 'Test Guide',
            order_index: 1,
            filename: 'custom-name.pdf'
        });

        const result = await verifyAssetFiles({
            type: 'guide',
            courseId,
            metadataStr: metadata
        });

        expect(result.expectedPath).toContain('custom-name.pdf');
    });

    it('should prioritize meta.filename for videos', async () => {
        const metadata = JSON.stringify({
            name: 'Test Video',
            order_index: 1,
            filename: 'custom-name.mp4'
        });

        const result = await verifyAssetFiles({
            type: 'video',
            courseId,
            metadataStr: metadata
        });

        expect(result.expectedPath).toContain('custom-name.mp4');
    });

    it('should fallback to safeName if meta.filename is missing (guides)', async () => {
        const metadata = JSON.stringify({
            name: 'Test Guide',
            order_index: 1
        });

        const result = await verifyAssetFiles({
            type: 'guide',
            courseId,
            metadataStr: metadata
        });

        expect(result.expectedPath).toContain('01_Test_Guide.pdf');
    });

    it('should fallback to safeName if meta.filename is missing (videos)', async () => {
        const metadata = JSON.stringify({
            name: 'Test Video',
            order_index: 1
        });

        const result = await verifyAssetFiles({
            type: 'video',
            courseId,
            metadataStr: metadata
        });

        expect(result.expectedPath).toContain('01_Test_Video.mp4');
    });
});
