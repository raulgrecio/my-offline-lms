import { describe, it, expect, vi, beforeEach } from 'vitest';
import { YtDlpVideoDownloader } from '@features/asset-download/infrastructure/YtDlpVideoDownloader';
import { IAuthSessionStorage } from '@features/auth-session/domain/ports/IAuthSessionStorage';
import { ILogger } from '@my-offline-lms/core';
import { spawn } from 'child_process';
import EventEmitter from 'events';

vi.mock('child_process');

describe('YtDlpVideoDownloader', () => {
    let mockAuthSession: IAuthSessionStorage;
    let mockLogger: ILogger;
    let downloader: YtDlpVideoDownloader;

    beforeEach(() => {
        vi.clearAllMocks();
        mockAuthSession = {
            getCookiesFile: vi.fn().mockResolvedValue('/mock/cookies.txt'),
            getAuthFile: vi.fn().mockResolvedValue('/mock/state.json'),
            ensureAuthDir: vi.fn().mockResolvedValue(undefined),
            saveCookies: vi.fn().mockResolvedValue(undefined),
        } as any;

        mockLogger = {
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
            debug: vi.fn(),
            withContext: vi.fn().mockReturnThis(),
        } as any;

        downloader = new YtDlpVideoDownloader({ authSessionStorage: mockAuthSession, logger: mockLogger });
        
        vi.useFakeTimers();
    });

    function createMockProcess() {
        const mockProcess = new EventEmitter() as any;
        mockProcess.stdout = new EventEmitter();
        mockProcess.stdout.pipe = vi.fn();
        mockProcess.stderr = new EventEmitter();
        return mockProcess;
    }

    it('should resolve immediately if process exits with code 0', async () => {
        const mockProcess = createMockProcess();
        vi.mocked(spawn).mockReturnValue(mockProcess);

        const promise = downloader.download('http://example.com/video', '/mock/out.mp4');
        
        await vi.waitUntil(() => vi.mocked(spawn).mock.calls.length === 1);
        mockProcess.emit('close', 0);

        await expect(promise).resolves.toBeUndefined();
        expect(spawn).toHaveBeenCalledWith('yt-dlp', expect.anything());
        expect(mockProcess.stdout.pipe).toHaveBeenCalledWith(process.stdout);
    });

    it('should reject with clear auth error if yt-dlp returns 403 in stderr', async () => {
        const mockProcess = createMockProcess();
        vi.mocked(spawn).mockReturnValue(mockProcess);

        const promise = downloader.download('http://example.com/video', '/mock/out.mp4');
        
        await vi.waitUntil(() => vi.mocked(spawn).mock.calls.length === 1);
        
        // Simulate 403 error in stderr
        mockProcess.stderr.emit('data', Buffer.from('ERROR: [generic] Unable to download webpage: HTTP Error 403: Forbidden'));
        mockProcess.emit('close', 1);

        await expect(promise).rejects.toThrow(/Login requerido/);
        expect(spawn).toHaveBeenCalledTimes(1); // No should retry on auth error
    });

    it('should retry on generic errors', async () => {
        const mockProcess1 = createMockProcess();
        const mockProcess2 = createMockProcess();
        
        vi.mocked(spawn)
            .mockReturnValueOnce(mockProcess1)
            .mockReturnValueOnce(mockProcess2);

        const promise = downloader.download('http://example.com/video', '/mock/out.mp4');
        
        await vi.waitUntil(() => vi.mocked(spawn).mock.calls.length === 1);
        mockProcess1.emit('close', 1); 
        
        await vi.runAllTimersAsync();
        
        await vi.waitUntil(() => vi.mocked(spawn).mock.calls.length === 2);
        mockProcess2.emit('close', 0);

        await expect(promise).resolves.toBeUndefined();
        expect(spawn).toHaveBeenCalledTimes(2);
    });
    it('should reject after 3 retries for generic errors', async () => {
        const mockProcess1 = createMockProcess();
        const mockProcess2 = createMockProcess();
        const mockProcess3 = createMockProcess();
        const mockProcess4 = createMockProcess();
        
        vi.mocked(spawn)
            .mockReturnValueOnce(mockProcess1)
            .mockReturnValueOnce(mockProcess2)
            .mockReturnValueOnce(mockProcess3)
            .mockReturnValueOnce(mockProcess4);

        const promise = downloader.download('http://example.com/video', '/mock/out.mp4');
        
        // Fail 4 times (0, 1, 2, 3 retry counts)
        for (let i = 1; i <= 3; i++) {
            await vi.waitUntil(() => vi.mocked(spawn).mock.calls.length === i);
            const currentMock = [mockProcess1, mockProcess2, mockProcess3][i-1];
            currentMock.emit('close', 1);
            await vi.runAllTimersAsync();
        }

        await vi.waitUntil(() => vi.mocked(spawn).mock.calls.length === 4);
        mockProcess4.emit('close', 1); // 4th total attempt (retryCount=3)

        await expect(promise).rejects.toThrow(/después de 3 reintentos/);
        expect(spawn).toHaveBeenCalledTimes(4);
    });
});
