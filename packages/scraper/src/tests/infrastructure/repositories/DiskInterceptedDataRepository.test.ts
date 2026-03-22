import { describe, it, expect, vi, beforeEach, Mocked } from 'vitest';
import fs from 'fs';

import { ILogger } from '@my-offline-lms/core';
import { DiskInterceptedDataRepository } from '@features/platform-sync/infrastructure/DiskInterceptedDataRepository';

vi.mock('fs', () => ({
    default: {
        promises: {
            mkdir: vi.fn().mockResolvedValue(undefined),
            readdir: vi.fn(),
            readFile: vi.fn(),
            unlink: vi.fn().mockResolvedValue(undefined),
            rename: vi.fn().mockResolvedValue(undefined),
            rm: vi.fn().mockResolvedValue(undefined),
            access: vi.fn().mockResolvedValue(undefined),
        },
        existsSync: vi.fn().mockReturnValue(true),
    }
}));

vi.mock('path', async () => {
    const actual = await vi.importActual<typeof import('path')>('path');
    return {
        default: {
            ...actual,
        }
    };
});

describe('DiskInterceptedDataRepository', () => {
    const mockBaseDir = '/mock/intercepted';
    let repo: DiskInterceptedDataRepository;

    const mockLogger: Mocked<ILogger> = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
        withContext: vi.fn().mockReturnThis()
    };

    beforeEach(() => {
        vi.clearAllMocks();
        repo = new DiskInterceptedDataRepository({ baseDir: mockBaseDir, logger: mockLogger });
    });

    it('should ensure directory exists before reading payloads', async () => {
        vi.mocked(fs.promises.readdir).mockResolvedValue([]);

        await repo.getPendingLearningPaths();

        expect(fs.promises.mkdir).toHaveBeenCalledWith(mockBaseDir, { recursive: true });
    });

    it('should return pending learning paths correctly filtering files', async () => {
        vi.mocked(fs.promises.readdir).mockResolvedValue([
            'content_learning_path_123_pagedata.json',
            'ignore_this_file.txt',
            'content_courses_456_metadata.json'
        ] as any);

        vi.mocked(fs.promises.readFile).mockResolvedValue('{"id": "123"}' as any);

        const result = await repo.getPendingLearningPaths();

        expect(result).toHaveLength(1);
        expect(result[0].filePath).toBe('/mock/intercepted/content_learning_path_123_pagedata.json');
        expect(result[0].content).toBe('{"id": "123"}');
    });

    it('should return pending courses correctly filtering files', async () => {
        vi.mocked(fs.promises.readdir).mockResolvedValue([
            'content_learning_path_123_pagedata.json',
            'content_courses_789_metadata.json',
            'content_courses_999_metadata.json'
        ] as any);

        vi.mocked(fs.promises.readFile).mockImplementation(async (path) => {
            if (path.toString().includes('789')) return '{"id": "789"}';
            return '{"id": "999"}';
        });

        const result = await repo.getPendingCourses();

        expect(result).toHaveLength(2);
        expect(result[0].filePath).toBe('/mock/intercepted/content_courses_789_metadata.json');
        expect(result[1].filePath).toBe('/mock/intercepted/content_courses_999_metadata.json');
    });

    it('should return pending courses filtered by identifier', async () => {
        vi.mocked(fs.promises.readdir).mockResolvedValue([
            'content_learning_path_123_pagedata.json',
            'content_courses_789_metadata.json',
            'content_courses_999_metadata.json'
        ] as any);

        vi.mocked(fs.promises.readFile).mockImplementation(async (path) => {
            if (path.toString().includes('789')) return '{"id": "789"}';
            return '{"id": "999"}';
        });

        const result = await repo.getPendingForCourse('789');

        expect(result).toHaveLength(1);
        expect(result[0].filePath).toBe('/mock/intercepted/content_courses_789_metadata.json');
    });

    it('should delete payload', async () => {
        await repo.deletePayload('/mock/intercepted/file.json');
        expect(fs.promises.unlink).toHaveBeenCalledWith('/mock/intercepted/file.json');
    });

    it('should ignore non-existent payload when deleting', async () => {
        vi.mocked(fs.promises.unlink).mockRejectedValue(new Error('ENOENT'));
        await expect(repo.deletePayload('/mock/intercepted/non_existent.json')).resolves.not.toThrow();
    });

    describe('markAsProcessed', () => {
        it('should rename payload when marking as processed', async () => {
            const filePath = '/mock/intercepted/file.json';
            await repo.markAsProcessed(filePath);
            expect(fs.promises.rename).toHaveBeenCalledWith(filePath, `${filePath}.processed`);
        });

        it('should catch and log warning if rename fails', async () => {
            vi.mocked(fs.promises.rename).mockRejectedValue(new Error('Lock error'));
            await repo.markAsProcessed('/mock/intercepted/locked.json');

            expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Could not mark as processed'));
        });
    });

    it('should delete workspace', async () => {
        await repo.deleteWorkspace();
        expect(fs.promises.rm).toHaveBeenCalledWith(mockBaseDir, { recursive: true, force: true });
    });
});

