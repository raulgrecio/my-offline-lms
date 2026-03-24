import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ILogger } from '@my-offline-lms/core/logging';

import { AuthSession } from '@features/auth-session/application/AuthSession';

vi.mock('readline', () => ({
  default: {
    emitKeypressEvents: vi.fn(),
  }
}));

describe('AuthSession Use Case', () => {
  const mockBrowserProvider = {
    getHeadfulContext: vi.fn(),
    close: vi.fn(),
  } as any;

  const mockAuthStorage = {
    getAuthFile: vi.fn().mockResolvedValue('/mock/state.json'),
    getCookiesFile: vi.fn().mockResolvedValue('/mock/cookies.txt'),
    saveCookies: vi.fn(),
    ensureAuthDir: vi.fn(),
  } as any;

  const mockLogger: ILogger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    withContext: vi.fn().mockReturnThis(),
  };

  let useCase: AuthSession;

  beforeEach(() => {
    vi.clearAllMocks();
    useCase = new AuthSession({
      browserProvider: mockBrowserProvider,
      authStorage: mockAuthStorage,
      logger: mockLogger,
    });

    // Mock stdin
    (process.stdin as any).isTTY = true;
    process.stdin.setRawMode = vi.fn().mockReturnThis();
    process.stdin.on = vi.fn().mockImplementation((event, cb) => {
      if (event === 'keypress') {
        // We'll trigger this manually in the test
        (useCase as any)._triggerKeypress = cb;
      }
      return process.stdin;
    });
  });

  it('should perform interactive login and save session on enter', async () => {
    const mockPage = {
      goto: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
    } as any;
    const mockContext = {
      newPage: vi.fn().mockResolvedValue(mockPage),
      close: vi.fn().mockResolvedValue(undefined),
      storageState: vi.fn().mockResolvedValue({}),
      cookies: vi.fn().mockResolvedValue([{ name: 'c1', value: 'v1' }])
    } as any;
    mockBrowserProvider.getHeadfulContext.mockResolvedValue(mockContext);

    const promise = useCase.execute({ baseUrl: 'http://base-url' });

    // Simulate keypress 'enter' to save session
    await vi.waitUntil(() => (useCase as any)._triggerKeypress);
    await (useCase as any)._triggerKeypress('', { name: 'enter' });

    expect(mockAuthStorage.saveCookies).toHaveBeenCalled();

    // Simulate keypress 'escape' to finish
    await (useCase as any)._triggerKeypress('', { name: 'escape' });

    await promise;

    expect(mockPage.goto).toHaveBeenCalledWith('http://base-url', expect.anything());
    expect(mockBrowserProvider.close).toHaveBeenCalled();
  });

  it('should handle Ctrl+C to exit', async () => {
    const mockContext = {
      newPage: vi.fn().mockResolvedValue({ goto: vi.fn() }),
      close: vi.fn(),
    } as any;
    mockBrowserProvider.getHeadfulContext.mockResolvedValue(mockContext);

    const promise = useCase.execute({ baseUrl: 'http://url' });
    await vi.waitUntil(() => (useCase as any)._triggerKeypress);

    // Simulate Ctrl+C
    await (useCase as any)._triggerKeypress('', { ctrl: true, name: 'c' });
    await promise;

    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Saliendo y cerrando navegador'));
  });

  it('should handle session save error', async () => {
    const mockContext = {
      newPage: vi.fn().mockResolvedValue({ goto: vi.fn() }),
      close: vi.fn(),
      storageState: vi.fn().mockRejectedValue(new Error('save failed')),
      cookies: vi.fn().mockResolvedValue([])
    } as any;
    mockBrowserProvider.getHeadfulContext.mockResolvedValue(mockContext);

    const promise = useCase.execute({ baseUrl: 'http://url' });
    await vi.waitUntil(() => (useCase as any)._triggerKeypress);

    // Trigger save session (return)
    await (useCase as any)._triggerKeypress('', { name: 'return' });
    expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Error al guardar sesión'), expect.any(Error));

    // Trigger save session (enter)
    await (useCase as any)._triggerKeypress('', { name: 'enter' });
    expect(mockLogger.error).toHaveBeenCalledTimes(2);

    // Close
    await (useCase as any)._triggerKeypress('', { name: 'escape' });
    await promise;
  });

  it('should work in non-TTY environment', async () => {
    const mockContext = {
      newPage: vi.fn().mockResolvedValue({ goto: vi.fn() }),
      close: vi.fn(),
    } as any;
    mockBrowserProvider.getHeadfulContext.mockResolvedValue(mockContext);

    (process.stdin as any).isTTY = false;

    const promise = useCase.execute({ baseUrl: 'http://url' });
    await vi.waitUntil(() => (useCase as any)._triggerKeypress);

    await (useCase as any)._triggerKeypress('', { name: 'escape' });
    await promise;

    expect(process.stdin.setRawMode).not.toHaveBeenCalled();
  });

  it('should trigger auto-save interval', async () => {
    vi.useFakeTimers();
    const mockContext = {
      newPage: vi.fn().mockResolvedValue({ goto: vi.fn() }),
      close: vi.fn(),
      storageState: vi.fn().mockResolvedValue({}),
      cookies: vi.fn().mockResolvedValue([])
    } as any;
    mockBrowserProvider.getHeadfulContext.mockResolvedValue(mockContext);

    const promise = useCase.execute({ baseUrl: 'http://url' });
    await vi.waitUntil(() => (useCase as any)._triggerKeypress);

    // Advance time by 15 minutes
    await vi.advanceTimersByTimeAsync(15 * 60 * 1000);

    expect(mockContext.storageState).toHaveBeenCalled();

    await (useCase as any)._triggerKeypress('', { name: 'escape' });
    await promise;
    vi.useRealTimers();
  });

  it('should ignore other keypresses', async () => {
    const mockContext = {
      newPage: vi.fn().mockResolvedValue({ goto: vi.fn() }),
      close: vi.fn(),
    } as any;
    mockBrowserProvider.getHeadfulContext.mockResolvedValue(mockContext);

    const promise = useCase.execute({ baseUrl: 'http://url' });
    await vi.waitUntil(() => (useCase as any)._triggerKeypress);

    // Simulate random key
    await (useCase as any)._triggerKeypress(' ', { name: 'space' });
    
    expect(mockAuthStorage.saveCookies).not.toHaveBeenCalled();

    // Close
    await (useCase as any)._triggerKeypress('', { name: 'escape' });
    await promise;
  });

  it('should handle auto-save error', async () => {
    vi.useFakeTimers();
    const mockContext = {
      newPage: vi.fn().mockResolvedValue({ goto: vi.fn() }),
      storageState: vi.fn().mockRejectedValue(new Error('auto-save failed')),
      cookies: vi.fn().mockResolvedValue([])
    } as any;
    mockBrowserProvider.getHeadfulContext.mockResolvedValue(mockContext);

    const promise = useCase.execute({ baseUrl: 'http://url' });
    await vi.waitUntil(() => (useCase as any)._triggerKeypress);

    // Advance time by 15 minutes
    await vi.advanceTimersByTimeAsync(15 * 60 * 1000);

    // The error is now caught inside saveSession and logged with "❌ Error al guardar sesión:"
    expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Error al guardar sesión'), expect.any(Error));

    await (useCase as any)._triggerKeypress('', { name: 'escape' });
    await promise;
    vi.useRealTimers();
  });
});
