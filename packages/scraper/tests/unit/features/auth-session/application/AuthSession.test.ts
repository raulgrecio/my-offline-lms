import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type ILogger } from '@core/logging';

import { AuthSession } from '@scraper/features/auth-session';

vi.mock('readline', () => ({
  default: {
    emitKeypressEvents: vi.fn(),
    createInterface: vi.fn().mockReturnValue({
      on: vi.fn(),
      close: vi.fn(),
    }),
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
    isValidSession: vi.fn().mockResolvedValue(false),
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
      url: vi.fn().mockReturnValue('http://base-url'),
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
      newPage: vi.fn().mockResolvedValue({ goto: vi.fn(), url: vi.fn().mockReturnValue('http://url') }),
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
      newPage: vi.fn().mockResolvedValue({ goto: vi.fn(), url: vi.fn().mockReturnValue('http://url') }),
      close: vi.fn(),
      storageState: vi.fn().mockRejectedValue(new Error('save failed')),
      cookies: vi.fn().mockResolvedValue([])
    } as any;
    mockBrowserProvider.getHeadfulContext.mockResolvedValue(mockContext);

    const promise = useCase.execute({ baseUrl: 'http://url' });
    await vi.waitUntil(() => (useCase as any)._triggerKeypress);

    // Trigger save session (return)
    await (useCase as any)._triggerKeypress('', { name: 'return' });
    expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Error al guardar la sesión'), expect.any(Error));

    // Trigger save session (enter)
    await (useCase as any)._triggerKeypress('', { name: 'enter' });
    expect(mockLogger.error).toHaveBeenCalledTimes(2);

    // Close
    await (useCase as any)._triggerKeypress('', { name: 'escape' });
    await promise;
  });

  it('should work in non-TTY environment', async () => {
    const mockContext = {
      newPage: vi.fn().mockResolvedValue({ goto: vi.fn(), url: vi.fn().mockReturnValue('http://url') }),
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
      newPage: vi.fn().mockResolvedValue({ goto: vi.fn(), url: vi.fn().mockReturnValue('http://url') }),
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
      newPage: vi.fn().mockResolvedValue({ goto: vi.fn(), url: vi.fn().mockReturnValue('http://url') }),
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

  it('should work in web mode (interactive: false)', async () => {
    const mockPage = {
      goto: vi.fn().mockResolvedValue(undefined),
      url: vi.fn().mockReturnValue('http://web-url'),
      exposeFunction: vi.fn(),
      evaluate: vi.fn(),
      on: vi.fn(),
      mainFrame: vi.fn().mockReturnThis(),
      close: vi.fn().mockResolvedValue(undefined),
    } as any;
    const mockContext = {
      newPage: vi.fn().mockResolvedValue(mockPage),
      storageState: vi.fn().mockResolvedValue({}),
      cookies: vi.fn().mockResolvedValue([{ name: 'c1', value: 'v1' }]),
      exposeFunction: vi.fn(),
    } as any;

    mockBrowserProvider.getHeadfulContext.mockResolvedValue(mockContext);

    // Capture the 'close' callback
    let closeCallback: any;
    mockPage.on.mockImplementation((event: string, cb: any) => {
      if (event === 'close') closeCallback = cb;
    });

    const promise = useCase.execute({ baseUrl: 'http://web-url', interactive: false });

    // Wait for the async call to exposeFunction
    await vi.waitUntil(() => mockContext.exposeFunction.mock.calls.length > 0);

    // Verify mocks for web mode
    expect(mockContext.exposeFunction).toHaveBeenCalledWith('finishAuthSession', expect.any(Function));

    // Simulate page 'load' and 'framenavigated'
    const loadCallback: any = mockPage.on.mock.calls.find((c: any) => c[0] === 'load')?.[1];
    const frameCallback: any = mockPage.on.mock.calls.find((c: any) => c[0] === 'framenavigated')?.[1];

    if (loadCallback) await loadCallback();
    if (frameCallback) await frameCallback(mockPage.mainFrame());
    // No evaluation needed anymore as logging and UI are handled differently
    expect(mockPage.evaluate).not.toHaveBeenCalled();

    // Trigger the exposed function to test saveSession
    const finishAuthFn: any = mockContext.exposeFunction.mock.calls.find((c: any) => c[0] === 'finishAuthSession')?.[1];
    const success = await finishAuthFn();
    expect(success).toBe(true);
    expect(mockAuthStorage.saveCookies).toHaveBeenCalled();

    // Simulate browser close to finish the use case
    if (closeCallback) await closeCallback();
    await promise;

    expect(mockBrowserProvider.close).toHaveBeenCalled();
  });
});
