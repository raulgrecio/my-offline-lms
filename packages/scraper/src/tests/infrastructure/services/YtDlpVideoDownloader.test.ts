import { describe, it, expect, vi, beforeEach } from 'vitest';
import { YtDlpVideoDownloader } from '@features/asset-download/infrastructure/YtDlpVideoDownloader';
import { IAuthSessionStorage } from '@features/auth-session/domain/ports/IAuthSessionStorage';
import { spawn } from 'child_process';
import EventEmitter from 'events';

vi.mock('child_process');

describe('YtDlpVideoDownloader', () => {
    let mockAuthSession: IAuthSessionStorage;
    let downloader: YtDlpVideoDownloader;

    beforeEach(() => {
        vi.clearAllMocks();
        mockAuthSession = {
            getCookiesFile: vi.fn().mockResolvedValue('/mock/cookies.txt'),
            getAuthFile: vi.fn().mockResolvedValue('/mock/state.json'),
            ensureAuthDir: vi.fn().mockResolvedValue(undefined),
            saveCookies: vi.fn().mockResolvedValue(undefined),
        };
        downloader = new YtDlpVideoDownloader(mockAuthSession);
        
        // Mock setTimeout to execute immediately
        vi.useFakeTimers();
    });

    it('should resolve immediately if process exits with code 0', async () => {
        const mockProcess = new EventEmitter() as any;
        vi.mocked(spawn).mockReturnValue(mockProcess);

        const promise = downloader.download('http://example.com/video', '/mock/out.mp4');
        
        // Wait for async setup in download()
        await vi.waitUntil(() => vi.mocked(spawn).mock.calls.length === 1);
        
        mockProcess.emit('close', 0);

        await expect(promise).resolves.toBeUndefined();
        expect(spawn).toHaveBeenCalledWith('yt-dlp', expect.arrayContaining(['http://example.com/video', '-o', '/mock/out.mp4', '--cookies', '/mock/cookies.txt']), { stdio: 'inherit' });
    });

    it('should retry if process exits with non-zero code', async () => {
        const mockProcess1 = new EventEmitter() as any;
        const mockProcess2 = new EventEmitter() as any;
        
        vi.mocked(spawn)
            .mockReturnValueOnce(mockProcess1)
            .mockReturnValueOnce(mockProcess2);

        const promise = downloader.download('http://example.com/video', '/mock/out.mp4');
        
        // Wait for first spawn
        await vi.waitUntil(() => vi.mocked(spawn).mock.calls.length === 1);
        mockProcess1.emit('close', 1); // Fail first time
        
        await vi.runAllTimersAsync(); // Fast-forward setTimeout delay
        
        // Wait for second spawn (which happens async after delay)
        await vi.waitUntil(() => vi.mocked(spawn).mock.calls.length === 2);
        
        mockProcess2.emit('close', 0); // Succeed second time

        await expect(promise).resolves.toBeUndefined();
        expect(spawn).toHaveBeenCalledTimes(2);
    });

    it('should reject after 3 retries', async () => {
        const mockProcess1 = new EventEmitter() as any;
        const mockProcess2 = new EventEmitter() as any;
        const mockProcess3 = new EventEmitter() as any;
        const mockProcess4 = new EventEmitter() as any;
        
        vi.mocked(spawn)
            .mockReturnValueOnce(mockProcess1)
            .mockReturnValueOnce(mockProcess2)
            .mockReturnValueOnce(mockProcess3)
            .mockReturnValueOnce(mockProcess4);

        const promise = downloader.download('http://example.com/video', '/mock/out.mp4');
        
        for (let i = 1; i <= 3; i++) {
            await vi.waitUntil(() => vi.mocked(spawn).mock.calls.length === i);
            const currentMock = i === 1 ? mockProcess1 : i === 2 ? mockProcess2 : mockProcess3;
            currentMock.emit('close', 1);
            await vi.runAllTimersAsync();
        }

        await vi.waitUntil(() => vi.mocked(spawn).mock.calls.length === 4);
        mockProcess4.emit('close', 1); // 4th failure

        await expect(promise).rejects.toThrow('yt-dlp error 1 después de 3 reintentos');
        expect(spawn).toHaveBeenCalledTimes(4);
    });
});
