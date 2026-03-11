import { describe, it, expect, vi, beforeEach, Mocked } from 'vitest';
import { DiskInterceptedDataRepository } from '@infrastructure/repositories/DiskInterceptedDataRepository';
import fs from 'fs';
import { ILogger } from '@domain/services/ILogger';

vi.mock('fs');
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
        repo = new DiskInterceptedDataRepository({baseDir: mockBaseDir, logger: mockLogger});
    });

    it('should ensure directory exists before reading payloads', () => {
        vi.mocked(fs.existsSync).mockReturnValue(false);
        vi.mocked(fs.readdirSync).mockReturnValue([]);
        
        repo.getPendingLearningPaths();
        
        expect(fs.mkdirSync).toHaveBeenCalledWith(mockBaseDir, { recursive: true });
    });

    it('should return pending learning paths correctly filtering files', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readdirSync).mockReturnValue([
            'content_learning_path_123_pagedata.json',
            'ignore_this_file.txt',
            'content_courses_456_metadata.json'
        ] as any);
        
        vi.mocked(fs.readFileSync).mockReturnValue('{"id": "123"}');

        const result = repo.getPendingLearningPaths();

        expect(result).toHaveLength(1);
        expect(result[0].filePath).toBe('/mock/intercepted/content_learning_path_123_pagedata.json');
        expect(result[0].content).toBe('{"id": "123"}');
    });

    it('should return pending courses correctly filtering files', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readdirSync).mockReturnValue([
            'content_learning_path_123_pagedata.json',
            'content_courses_789_metadata.json',
            'content_courses_999_metadata.json'
        ] as any);
        
        vi.mocked(fs.readFileSync).mockImplementation((path) => {
            if (path.toString().includes('789')) return '{"id": "789"}';
            return '{"id": "999"}';
        });

        const result = repo.getPendingCourses();

        expect(result).toHaveLength(2);
        expect(result[0].filePath).toBe('/mock/intercepted/content_courses_789_metadata.json');
        expect(result[1].filePath).toBe('/mock/intercepted/content_courses_999_metadata.json');
    });

    it('should return pending courses filtered by identifier', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readdirSync).mockReturnValue([
            'content_learning_path_123_pagedata.json',
            'content_courses_789_metadata.json',
            'content_courses_999_metadata.json'
        ] as any);
        
        vi.mocked(fs.readFileSync).mockImplementation((path) => {
            if (path.toString().includes('789')) return '{"id": "789"}';
            return '{"id": "999"}';
        });

        const result = repo.getPendingForCourse('789');

        expect(result).toHaveLength(1);
        expect(result[0].filePath).toBe('/mock/intercepted/content_courses_789_metadata.json');
    });

    it('should delete payload if it exists', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        repo.deletePayload('/mock/intercepted/file.json');
        expect(fs.unlinkSync).toHaveBeenCalledWith('/mock/intercepted/file.json');
    });

    it('should not throw error when deleting non-existent payload', () => {
        vi.mocked(fs.existsSync).mockReturnValue(false);
        expect(() => repo.deletePayload('/mock/intercepted/non_existent.json')).not.toThrow();
        expect(fs.unlinkSync).not.toHaveBeenCalled();
    });

    it('should catch and ignore errors during deletion', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.unlinkSync).mockImplementation(() => {
            throw new Error('Permission denied');
        });
        
        expect(() => repo.deletePayload('/mock/intercepted/locked.json')).not.toThrow();
        expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Could not delete'));
    });

    describe('markAsProcessed', () => {
        it('should rename payload when marking as processed', () => {
            vi.mocked(fs.existsSync).mockReturnValue(true);
            const filePath = '/mock/intercepted/file.json';
            repo.markAsProcessed(filePath);
            expect(fs.renameSync).toHaveBeenCalledWith(filePath, `${filePath}.processed`);
        });

        it('should not rename if payload does not exist', () => {
            vi.mocked(fs.existsSync).mockReturnValue(false);
            repo.markAsProcessed('/mock/intercepted/non_existent.json');
            expect(fs.renameSync).not.toHaveBeenCalled();
        });

        it('should catch and log warning if rename fails', () => {
            vi.mocked(fs.existsSync).mockReturnValue(true);
            vi.mocked(fs.renameSync).mockImplementation(() => {
                throw new Error('Lock error');
            });
            repo.markAsProcessed('/mock/intercepted/locked.json');
            
            expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Could not mark as processed'));
        });
    });
});

