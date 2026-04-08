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
    closeContext: vi.fn(),
    close: vi.fn(),
  } as any;

  const mockAuthStorage = {
    getAuthFile: vi.fn().mockResolvedValue('/mock/state.json'),
    getCookiesFile: vi.fn().mockResolvedValue('/mock/cookies.txt'),
    saveCookies: vi.fn(),
    getCookies: vi.fn().mockResolvedValue([]),
    ensureAuthDir: vi.fn(),
  } as any;

  const mockValidator = {
    isValid: vi.fn().mockReturnValue(false),
    getExpiry: vi.fn().mockReturnValue(null),
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
      validator: mockValidator,
      logger: mockLogger,
    });

    // Mock stdin
    (process.stdin as any).isTTY = true;
    process.stdin.setRawMode = vi.fn().mockReturnThis();
    process.stdin.removeListener = vi.fn().mockReturnThis();
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
      on: vi.fn().mockReturnValue(undefined),
      addInitScript: vi.fn().mockResolvedValue(undefined),
    } as any;
    const mockContext = {
      newPage: vi.fn().mockResolvedValue(mockPage),
      close: vi.fn().mockResolvedValue(undefined),
      storageState: vi.fn().mockResolvedValue({}),
      cookies: vi.fn().mockResolvedValue([{ name: 'c1', value: 'v1' }]),
      exposeFunction: vi.fn().mockResolvedValue(undefined),
      on: vi.fn().mockResolvedValue(undefined),
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
    expect(mockBrowserProvider.closeContext).toHaveBeenCalled();
  });

  it('should handle Ctrl+C to exit', async () => {
    const mockPage = {
      goto: vi.fn(),
      url: vi.fn().mockReturnValue('http://url'),
      on: vi.fn().mockReturnValue(undefined),
      addInitScript: vi.fn().mockResolvedValue(undefined),
    };
    const mockContext = {
      newPage: vi.fn().mockResolvedValue(mockPage),
      close: vi.fn(),
      exposeFunction: vi.fn().mockResolvedValue(undefined),
      on: vi.fn().mockResolvedValue(undefined),
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
    const mockPage = {
      goto: vi.fn(),
      url: vi.fn().mockReturnValue('http://url'),
      on: vi.fn().mockReturnValue(undefined),
      addInitScript: vi.fn().mockResolvedValue(undefined),
    };
    const mockContext = {
      newPage: vi.fn().mockResolvedValue(mockPage),
      close: vi.fn(),
      storageState: vi.fn().mockRejectedValue(new Error('save failed')),
      cookies: vi.fn().mockResolvedValue([]),
      exposeFunction: vi.fn().mockResolvedValue(undefined),
      on: vi.fn().mockResolvedValue(undefined),
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
    const mockPage = {
      goto: vi.fn(),
      url: vi.fn().mockReturnValue('http://url'),
      on: vi.fn().mockReturnValue(undefined),
      addInitScript: vi.fn().mockResolvedValue(undefined),
    };
    const mockContext = {
      newPage: vi.fn().mockResolvedValue(mockPage),
      close: vi.fn(),
      exposeFunction: vi.fn().mockResolvedValue(undefined),
      on: vi.fn().mockResolvedValue(undefined),
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
    const mockPage = {
      goto: vi.fn(),
      url: vi.fn().mockReturnValue('http://url'),
      on: vi.fn().mockReturnValue(undefined),
      addInitScript: vi.fn().mockResolvedValue(undefined),
    };
    const mockContext = {
      newPage: vi.fn().mockResolvedValue(mockPage),
      close: vi.fn(),
      storageState: vi.fn().mockResolvedValue({}),
      cookies: vi.fn().mockResolvedValue([]),
      exposeFunction: vi.fn().mockResolvedValue(undefined),
      on: vi.fn().mockResolvedValue(undefined),
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
    const mockPage = {
      goto: vi.fn(),
      url: vi.fn().mockReturnValue('http://url'),
      on: vi.fn().mockReturnValue(undefined),
      addInitScript: vi.fn().mockResolvedValue(undefined),
    };
    const mockContext = {
      newPage: vi.fn().mockResolvedValue(mockPage),
      close: vi.fn(),
      exposeFunction: vi.fn().mockResolvedValue(undefined),
      on: vi.fn().mockResolvedValue(undefined),
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
      addInitScript: vi.fn().mockResolvedValue(undefined),
    } as any;
    const mockContext = {
      newPage: vi.fn().mockResolvedValue(mockPage),
      storageState: vi.fn().mockResolvedValue({}),
      cookies: vi.fn().mockResolvedValue([{ name: 'c1', value: 'v1' }]),
      exposeFunction: vi.fn().mockResolvedValue(undefined),
      on: vi.fn().mockResolvedValue(undefined),
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

    expect(mockBrowserProvider.closeContext).toHaveBeenCalled();
  });

  describe('Oracle Session Monitoring & Edge Cases', () => {
    it('should monitor console logs for joinedRoom events', async () => {
      const mockPage = {
        goto: vi.fn().mockResolvedValue(undefined),
        on: vi.fn(),
        newPage: vi.fn(),
        url: vi.fn().mockReturnValue('http://platform.com'),
        close: vi.fn().mockResolvedValue(undefined)
      } as any;
      const mockContext = {
        newPage: vi.fn().mockResolvedValue(mockPage),
        on: vi.fn(),
        exposeFunction: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined)
      } as any;
      mockBrowserProvider.getHeadfulContext.mockResolvedValue(mockContext);

      const pageEvents: Record<string, any> = {};
      mockPage.on.mockImplementation((event: string, cb: any) => {
        pageEvents[event] = cb;
      });
      const contextEvents: Record<string, any> = {};
      mockContext.on.mockImplementation((event: string, cb: any) => {
        contextEvents[event] = cb;
      });

      const promise = useCase.execute({ interactive: false });
      await vi.waitUntil(() => pageEvents['console']);

      // 1. Guest detected
      pageEvents['console']({ text: () => '... joinedRoom ... "roomId":"guest" ...', type: () => 'info' });
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Invitado (Sesión Cerrada)'));

      // 2. User login detected
      pageEvents['console']({ text: () => '... joinedRoom ... "roomId":"user123" ...', type: () => 'info' });
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('LOGIN DETECTADO! Usuario: user123'));

      // 3. Browser error log
      pageEvents['console']({ text: () => 'Something went wrong', type: () => 'error' });
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('[Browser-Error] Something went wrong'));

      // Terminate by simulating page close
      if (pageEvents['close']) await pageEvents['close']();
      await promise;
    });

    it('should monitor network responses for set-cookie headers', async () => {
      const mockPage = {
        goto: vi.fn().mockResolvedValue(undefined),
        on: vi.fn(),
        newPage: vi.fn(),
        url: vi.fn().mockReturnValue('http://platform.com'),
        close: vi.fn().mockResolvedValue(undefined)
      } as any;
      const mockContext = {
        newPage: vi.fn().mockResolvedValue(mockPage),
        on: vi.fn(),
        exposeFunction: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined)
      } as any;
      mockBrowserProvider.getHeadfulContext.mockResolvedValue(mockContext);

      const pageEvents: Record<string, any> = {};
      mockPage.on.mockImplementation((event: string, cb: any) => {
        pageEvents[event] = cb;
      });
      const contextEvents: Record<string, any> = {};
      mockContext.on.mockImplementation((event: string, cb: any) => {
        contextEvents[event] = cb;
      });

      const promise = useCase.execute({ interactive: false });
      await vi.waitUntil(() => contextEvents['response']);

      // Simulate a response with a cookie
      contextEvents['response']({
        url: () => 'http://platform/api',
        headers: () => ({ 'set-cookie': 'session=xyz' })
      });
      expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringContaining('Cookie detectada'));

      // Simulate a response WITHOUT a cookie
      contextEvents['response']({
        url: () => 'http://platform/api',
        headers: () => ({})
      });
      // Should not call debug again for cookie
      expect(mockLogger.debug).toHaveBeenCalledTimes(1);

      // Terminate
      if (pageEvents['close']) await pageEvents['close']();
      await promise;
    });

    it('should warn when navigating to unauthorized or login URLs', async () => {
      const mockPage = {
        goto: vi.fn().mockResolvedValue(undefined),
        on: vi.fn(),
        url: vi.fn().mockReturnValue('http://platform/login'),
        mainFrame: vi.fn().mockReturnThis()
      } as any;
      const mockContext = {
        newPage: vi.fn().mockResolvedValue(mockPage),
        on: vi.fn(),
        exposeFunction: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined)
      } as any;
      mockBrowserProvider.getHeadfulContext.mockResolvedValue(mockContext);

      const pageEvents: Record<string, any> = {};
      mockPage.on.mockImplementation((event: string, cb: any) => {
        pageEvents[event] = cb;
      });

      const promise = useCase.execute({ interactive: false });
      await vi.waitUntil(() => pageEvents['framenavigated']);

      // Simulate navigation to login
      await pageEvents['framenavigated'](mockPage.mainFrame());
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('pérdida de sesión detectada'));

      // Terminate
      if (pageEvents['close']) await pageEvents['close']();
      await promise;
    });

    it('should log when a valid previous session is loaded', async () => {
      mockValidator.isValid.mockReturnValue(true);
      const mockPage = { goto: vi.fn().mockResolvedValue(undefined), on: vi.fn(), url: vi.fn().mockReturnValue('http://platform.com'), close: vi.fn().mockResolvedValue(undefined) } as any;
      const mockContext = {
        newPage: vi.fn().mockResolvedValue(mockPage),
        on: vi.fn(),
        exposeFunction: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined)
      } as any;
      mockBrowserProvider.getHeadfulContext.mockResolvedValue(mockContext);

      const pageEvents: Record<string, any> = {};
      mockPage.on.mockImplementation((event: string, cb: any) => {
        pageEvents[event] = cb;
      });

      const promise = useCase.execute({ interactive: false });
      await vi.waitUntil(() => (mockLogger.info as any).mock.calls.some((c: any) => c[0].includes('sesión previa detectada')));

      // Terminate
      if (pageEvents['close']) await pageEvents['close']();
      await promise;
    });

    it('should return error if saveActiveSession is called without context', async () => {
      // Reset usecase to ensure no activeContext
      const standaloneUseCase = new AuthSession({
        browserProvider: mockBrowserProvider,
        authStorage: mockAuthStorage,
        validator: mockValidator,
        logger: mockLogger,
      });
      const result = await standaloneUseCase.saveActiveSession();
      expect(result.success).toBe(false);
      expect(result.error).toBe("No hay sesión activa para guardar.");
    });

    it('should handle frameattached event for debugging', async () => {
      const mockPage = { goto: vi.fn(), on: vi.fn() } as any;
      const mockContext = {
        newPage: vi.fn().mockResolvedValue(mockPage),
        on: vi.fn(),
        exposeFunction: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined)
      } as any;
      mockBrowserProvider.getHeadfulContext.mockResolvedValue(mockContext);

      const pageEvents: Record<string, any> = {};
      mockPage.on.mockImplementation((event: string, cb: any) => {
        pageEvents[event] = cb;
      });

      const promise = useCase.execute({ interactive: false });
      await vi.waitUntil(() => pageEvents['frameattached']);

      pageEvents['frameattached']({ url: () => 'http://iframe' });
      expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringContaining('Nuevo Frame detectado: http://iframe'));

      if (pageEvents['close']) await pageEvents['close']();
      await promise;
    });

    it('should handle joinedRoom with unknown user ID', async () => {
      const mockPage = { goto: vi.fn(), on: vi.fn(), url: vi.fn().mockReturnValue('http://platform.com'), close: vi.fn().mockResolvedValue(undefined) } as any;
      const mockContext = {
        newPage: vi.fn().mockResolvedValue(mockPage),
        on: vi.fn(),
        exposeFunction: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined)
      } as any;
      mockBrowserProvider.getHeadfulContext.mockResolvedValue(mockContext);

      const pageEvents: Record<string, any> = {};
      mockPage.on.mockImplementation((event: string, cb: any) => {
        pageEvents[event] = cb;
      });

      const promise = useCase.execute({ interactive: false });
      await vi.waitUntil(() => pageEvents['console']);

      // joinedRoom with missing roomId (malformed but triggers logic)
      pageEvents['console']({ text: () => 'joinedRoom "roomId":""', type: () => 'info' });
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Usuario: desconocido'));
      if (pageEvents['close']) await pageEvents['close']();
      await promise;
    });

    it('should cover edge cases in monitoring (empty frame url, subframe navigation)', async () => {
      const mockPage = { goto: vi.fn(), on: vi.fn(), url: vi.fn().mockReturnValue('http://platform.com'), mainFrame: vi.fn(), close: vi.fn() } as any;
      mockPage.mainFrame.mockReturnValue('MAIN');
      const mockContext = { newPage: vi.fn().mockResolvedValue(mockPage), on: vi.fn(), exposeFunction: vi.fn().mockResolvedValue(undefined), close: vi.fn() } as any;
      mockBrowserProvider.getHeadfulContext.mockResolvedValue(mockContext);

      const pageEvents: Record<string, any> = {};
      mockPage.on.mockImplementation((event: string, cb: any) => { pageEvents[event] = cb; });
      const contextEvents: Record<string, any> = {};
      mockContext.on.mockImplementation((event: string, cb: any) => { contextEvents[event] = cb; });

      const promise = useCase.execute({ interactive: false });
      await vi.waitUntil(() => pageEvents['frameattached']);

      // 1. Frame without URL (covers 'cargando...')
      pageEvents['frameattached']({ url: () => '' });
      expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringContaining('cargando...'));

      // 2. Navigation in a SUB-frame (should be ignored due to mainFrame check)
      pageEvents['framenavigated']('SUBFRAME');
      expect(mockLogger.info).not.toHaveBeenCalledWith(expect.stringContaining('[Navigation] URL:'));

      // 3. Log with joinedRoom but NO roomId string (covers skipping inner if)
      pageEvents['console']({ text: () => 'joinedRoom but nothing else', type: () => 'info' });

      if (pageEvents['close']) await pageEvents['close']();
      await promise;
    });
  });
});


