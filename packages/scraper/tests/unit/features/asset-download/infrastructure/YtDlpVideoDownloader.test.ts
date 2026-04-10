import { describe, it, expect, vi, beforeEach } from 'vitest';
import { spawn } from 'child_process';
import EventEmitter from 'events';

import { type ILogger } from '@core/logging';
import { YtDlpVideoDownloader } from '@scraper/features/asset-download/infrastructure/YtDlpVideoDownloader';
import { type IAuthSessionStorage } from '@scraper/features/auth-session/domain/ports/IAuthSessionStorage';

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
    mockProcess.stderr = new EventEmitter();
    return mockProcess;
  }

  it('should resolve immediately if process exits with code 0', async () => {
    const mockProcess = createMockProcess();
    vi.mocked(spawn).mockReturnValue(mockProcess);

    const promise = downloader.download('http://example.com/video', '/mock/out.mp4');

    await vi.waitUntil(() => vi.mocked(spawn).mock.calls.length === 1);

    // Simulate stdout data
    mockProcess.stdout.emit('data', Buffer.from('[download]   10% of 100MiB'));

    mockProcess.emit('close', 0);

    await expect(promise).resolves.toBeUndefined();
    expect(spawn).toHaveBeenCalledWith('yt-dlp', expect.anything());
    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('[download]'));
  });

  it('should include referer in args if provided', async () => {
    const mockProcess = createMockProcess();
    vi.mocked(spawn).mockReturnValue(mockProcess);

    const promise = downloader.download('http://example.com/video', '/mock/out.mp4', 'http://referer.com');

    await vi.waitUntil(() => vi.mocked(spawn).mock.calls.length === 1);
    mockProcess.emit('close', 0);

    await promise;
    expect(spawn).toHaveBeenCalledWith('yt-dlp', expect.arrayContaining(['--referer', 'http://referer.com']));
  });

  it('should reject with clear auth error if yt-dlp returns 403 in stderr', async () => {
    const mockProcess = createMockProcess();
    vi.mocked(spawn).mockReturnValue(mockProcess);

    const promise = downloader.download('http://example.com/video', '/mock/out.mp4');
    promise.catch(() => { });

    await vi.waitUntil(() => vi.mocked(spawn).mock.calls.length === 1);

    // Simulate 403 error in stderr
    mockProcess.stderr.emit('data', Buffer.from('ERROR: [generic] Unable to download webpage: HTTP Error 403: Forbidden'));
    mockProcess.emit('close', 1);

    await expect(promise).rejects.toThrow(/Login requerido/);
    expect(spawn).toHaveBeenCalledTimes(1); // No should retry on auth error
  });

  it('should reject with auth error for other strings like "Unauthorized" or "Sign in"', async () => {
    const testError = async (errMsg: string) => {
      const mockProcess = createMockProcess();
      vi.mocked(spawn).mockReturnValue(mockProcess);
      const promise = downloader.download('http://v', '/o');
      promise.catch(() => { });

      await vi.waitUntil(() => vi.mocked(spawn).mock.calls.length >= 1);

      mockProcess.stderr.emit('data', Buffer.from(errMsg));
      mockProcess.emit('close', 1);

      // In case it doesn't detect it and tries to retry
      await vi.runAllTimersAsync();

      await expect(promise).rejects.toThrow(/Login requerido/);
    };

    vi.clearAllMocks();
    await testError('Sign in to confirm you are not a bot');
    vi.clearAllMocks();
    await testError('Please login to view this video');
    vi.clearAllMocks();
    await testError('HTTP Error 401: Unauthorized');
  });

  it('should handle code null as a failure and retry', async () => {
    const mockProcess = createMockProcess();
    const mockProcess2 = createMockProcess();
    vi.mocked(spawn).mockReturnValueOnce(mockProcess).mockReturnValueOnce(mockProcess2);

    const promise = downloader.download('http://v', '/o');
    await vi.waitUntil(() => vi.mocked(spawn).mock.calls.length === 1);
    mockProcess.emit('close', null);

    await vi.runAllTimersAsync();
    await vi.waitUntil(() => vi.mocked(spawn).mock.calls.length === 2);
    mockProcess2.emit('close', 0);

    await expect(promise).resolves.toBeUndefined();
  });

  it('should reject if process emits an error event', async () => {
    const mockProcess = createMockProcess();
    vi.mocked(spawn).mockReturnValue(mockProcess);

    const promise = downloader.download('http://v', '/o');
    promise.catch(() => { });

    // Wait for listeners to be attached (after await getCookiesFile)
    await vi.waitUntil(() => vi.mocked(spawn).mock.calls.length === 1);

    mockProcess.emit('error', new Error('Spawn failed'));

    await expect(promise).rejects.toThrow('Spawn failed');
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
      const currentMock = [mockProcess1, mockProcess2, mockProcess3][i - 1];
      currentMock.emit('close', 1);
      await vi.runAllTimersAsync();
    }

    await vi.waitUntil(() => vi.mocked(spawn).mock.calls.length === 4);
    mockProcess4.emit('close', 1); // 4th total attempt (retryCount=3)

    await expect(promise).rejects.toThrow(/después de 3 reintentos/);
    expect(spawn).toHaveBeenCalledTimes(4);
  });
});
