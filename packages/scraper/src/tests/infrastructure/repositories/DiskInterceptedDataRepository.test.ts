import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DiskInterceptedDataRepository } from '@infrastructure/repositories/DiskInterceptedDataRepository';
import fs from 'fs';

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
    const mockBaseDir = '/mock/debug';
    let repo: DiskInterceptedDataRepository;

    beforeEach(() => {
        vi.clearAllMocks();
        repo = new DiskInterceptedDataRepository(mockBaseDir);
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
        expect(result[0].filePath).toBe('/mock/debug/content_learning_path_123_pagedata.json');
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
        expect(result[0].filePath).toBe('/mock/debug/content_courses_789_metadata.json');
        expect(result[1].filePath).toBe('/mock/debug/content_courses_999_metadata.json');
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
        expect(result[0].filePath).toBe('/mock/debug/content_courses_789_metadata.json');
    });

    it('should delete payload if it exists', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        repo.deletePayload('/mock/debug/file.json');
        expect(fs.unlinkSync).toHaveBeenCalledWith('/mock/debug/file.json');
    });

    it('should not throw error when deleting non-existent payload', () => {
        vi.mocked(fs.existsSync).mockReturnValue(false);
        expect(() => repo.deletePayload('/mock/debug/non_existent.json')).not.toThrow();
        expect(fs.unlinkSync).not.toHaveBeenCalled();
    });

    it('should catch and ignore errors during deletion', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.unlinkSync).mockImplementation(() => {
            throw new Error('Permission denied');
        });
        
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        
        expect(() => repo.deletePayload('/mock/debug/locked.json')).not.toThrow();
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Could not delete'));
        
        consoleSpy.mockRestore();
    });

    describe('markAsProcessed', () => {
        it('should rename payload when marking as processed', () => {
            vi.mocked(fs.existsSync).mockReturnValue(true);
            const filePath = '/mock/debug/file.json';
            repo.markAsProcessed(filePath);
            expect(fs.renameSync).toHaveBeenCalledWith(filePath, `${filePath}.processed`);
        });

        it('should not rename if payload does not exist', () => {
            vi.mocked(fs.existsSync).mockReturnValue(false);
            repo.markAsProcessed('/mock/debug/non_existent.json');
            expect(fs.renameSync).not.toHaveBeenCalled();
        });

        it('should catch and log warning if rename fails', () => {
            vi.mocked(fs.existsSync).mockReturnValue(true);
            vi.mocked(fs.renameSync).mockImplementation(() => {
                throw new Error('Lock error');
            });
            const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            
            repo.markAsProcessed('/mock/debug/locked.json');
            
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Could not mark as processed'));
            consoleSpy.mockRestore();
        });
    });
});

