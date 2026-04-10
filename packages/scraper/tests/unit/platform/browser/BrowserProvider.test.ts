import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('playwright-extra', () => {
  const mChromium = {
    use: vi.fn(),
    launch: vi.fn(),
  };
  (mChromium.use as any).mockReturnThis();
  return {
    chromium: mChromium,
  };
});

vi.mock('puppeteer-extra-plugin-stealth', () => ({
  default: vi.fn(() => ({ name: 'stealth' })),
}));

import { chromium } from "playwright-extra";
import { BrowserProvider } from '@scraper/platform/browser/BrowserProvider';
import { AbortContext } from '@scraper/features/task-management';

describe('BrowserProvider (Multi-session Support)', () => {
  const mockLogger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    withContext: vi.fn().mockReturnThis(),
  } as any;

  const mockPage = {
    on: vi.fn(),
    close: vi.fn().mockResolvedValue(undefined),
  };

  const mockContext = {
    newPage: vi.fn().mockResolvedValue(mockPage),
    close: vi.fn().mockResolvedValue(undefined),
  };

  let mockBrowser: any;

  const createMockBrowser = () => {
    const list: any[] = [];
    const b: any = {
      newContext: vi.fn().mockImplementation(() => {
        const ctx = {
          newPage: vi.fn().mockResolvedValue(mockPage),
          close: vi.fn().mockImplementation(() => {
            const idx = list.indexOf(ctx);
            if (idx > -1) list.splice(idx, 1);
            return Promise.resolve();
          }),
          browser: vi.fn(() => b),
        };
        list.push(ctx);
        return Promise.resolve(ctx);
      }),
      contexts: vi.fn(() => list),
      on: vi.fn(),
      close: vi.fn().mockResolvedValue(undefined),
    };
    return b;
  };

  const mockFs = {
    stat: vi.fn().mockRejectedValue(new Error('no file')),
    exists: vi.fn().mockResolvedValue(false),
  } as any;

  const mockPath = {
    join: vi.fn((...args) => args.join('/')),
    resolve: vi.fn((arg) => arg),
  } as any;

  const config = {
    authStateFile: '/tmp/auth-state.json'
  };

  let provider: BrowserProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    // Default FS mock behavior - reset for every test to avoid pollution
    vi.mocked(mockFs.stat).mockRejectedValue(new Error('ENOENT'));
    vi.mocked(mockFs.exists).mockResolvedValue(false);

    mockBrowser = createMockBrowser();
    
    let isFirstCall = true;
    (chromium.launch as any).mockImplementation(() => {
      if (isFirstCall) {
        isFirstCall = false;
        return Promise.resolve(mockBrowser);
      }
      return Promise.resolve(createMockBrowser());
    });

    provider = new BrowserProvider({
      fs: mockFs,
      path: mockPath,
      config
    });
  });

  it('should launch browser only once for multiple contexts of same type', async () => {
    await provider.getHeadfulContext();
    await provider.getHeadfulContext();

    expect(chromium.launch).toHaveBeenCalledTimes(1);
    expect(mockBrowser.newContext).toHaveBeenCalledTimes(2);
  });

  it('should support parallel headful and headless browsers simultaneously', async () => {
    // 1. Launch headful
    const headfulCtx = await provider.getHeadfulContext({ headless: false });
    
    // 2. Launch headless in parallel
    const headlessCtx = await provider.getHeadfulContext({ headless: true });

    // Should have launched chromium twice perfectly isolated
    expect(chromium.launch).toHaveBeenCalledTimes(2);

    // Both should be open
    // @ts-ignore
    expect(headfulCtx.browser().contexts().length).toBe(1);
    // @ts-ignore
    expect(headlessCtx.browser().contexts().length).toBe(1);

    // 3. Close the headful context
    await provider.closeContext(headfulCtx);

    // Check that exactly the headful browser is closed (first one returned in mock == mockBrowser)
    expect(mockBrowser.close).toHaveBeenCalledTimes(1);
    
    // The headless browser should STILL be active because they don't crash each other!
    // @ts-ignore
    expect(headlessCtx.browser().close).not.toHaveBeenCalled();

    // 4. Test requesting another headless context reuses the existing headless browser
    await provider.getHeadfulContext({ headless: true });
    expect(chromium.launch).toHaveBeenCalledTimes(2); // Stays at 2!!
  });

  it('should close only the requested context if others are active', async () => {
    const ctx1 = await provider.getHeadfulContext();
    const ctx2 = await provider.getHeadfulContext();

    await provider.closeContext(ctx1);

    expect(ctx1.close).toHaveBeenCalled();
    expect(mockBrowser.close).not.toHaveBeenCalled(); // Browser stays alive for ctx2
  });

  it('should close the browser when the last context is closed', async () => {
    const ctx1 = await provider.getHeadfulContext();

    await provider.closeContext(ctx1);

    expect(ctx1.close).toHaveBeenCalled();
    expect(mockBrowser.close).toHaveBeenCalled(); // Last context closed -> kill browser process
  });

  it('should clear contexts and close browser when whole provider is closed', async () => {
    await provider.getHeadfulContext();
    await provider.getHeadfulContext();

    await provider.close();

    expect(mockBrowser.close).toHaveBeenCalled();
    // Verify it doesn't try to reuse after close
    await provider.getHeadfulContext();
    expect(chromium.launch).toHaveBeenCalledTimes(2); // Second launch after full close
  });

  it('should handle manual browser disconnection', async () => {
    let disconnectCb: any;
    mockBrowser.on.mockImplementation((event: string, cb: any) => {
      if (event === 'disconnected') disconnectCb = cb;
    });

    await provider.getHeadfulContext();
    if (disconnectCb) disconnectCb();

    // After manual disconnect, next request should launch a new one
    await provider.getHeadfulContext();
    expect(chromium.launch).toHaveBeenCalledTimes(2);
  });

  describe('Session Contexts (Headless/State)', () => {
    it('should warn if session state is older than 24 hours', async () => {
      const oldDate = new Date();
      oldDate.setHours(oldDate.getHours() - 25);
      
      vi.mocked(mockFs.stat).mockResolvedValue({ mtime: oldDate } as any);
      
      const providerWithLogger = new BrowserProvider({
        fs: mockFs,
        path: mockPath,
        config,
        logger: mockLogger
      });

      await providerWithLogger.getHeadfulContext();
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('La sesión guardada tiene 25 horas'));
    });

    it('should use executablePath if provided in config', async () => {
      const customConfig = { ...config, chromeExecutablePath: '/usr/bin/google-chrome' };
      const providerWithCustomChrome = new BrowserProvider({ fs: mockFs, path: mockPath, config: customConfig });
      
      await providerWithCustomChrome.getHeadfulContext();
      expect(chromium.launch).toHaveBeenCalledWith(expect.objectContaining({
        executablePath: '/usr/bin/google-chrome',
        channel: undefined
      }));
    });

    it('should round hours in warning message', async () => {
        const oldDate = new Date();
        oldDate.setMinutes(oldDate.getMinutes() - 150); // 2.5 hours -> round to 3? No, only > 24
        oldDate.setHours(oldDate.getHours() - 27.5); // 27.5 + 2.5 = 30.0 exactas
        
        vi.mocked(mockFs.stat).mockResolvedValue({ mtime: oldDate } as any);
        const p = new BrowserProvider({ fs: mockFs, path: mockPath, config, logger: mockLogger });
        await p.getHeadfulContext();
        expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('30 horas'));
    });

    it('should use default date if mtime is missing in stats', async () => {
      vi.mocked(mockFs.stat).mockResolvedValue({} as any); // No mtime
      await provider.getHeadfulContext();
      // Should not throw, coverage of the || new Date()
    });

    it('should throw error in getAuthenticatedContext if session does not exist', async () => {
      // stats == null in code because mockFs.stat rejects by default
      await expect(provider.getAuthenticatedContext()).rejects.toThrow(/No existe sesión guardada/i);
    });

    it('should return a headless context in getAuthenticatedContext if session exists', async () => {
      vi.mocked(mockFs.stat).mockResolvedValue({ mtime: new Date() } as any);
      
      const ctx = await provider.getAuthenticatedContext();
      expect(ctx).toBeDefined();
      expect(chromium.launch).toHaveBeenCalledWith(expect.objectContaining({ headless: true }));
    });
  });

  describe('Closing edge cases', () => {
    it('should handle closing a non-tracked context gracefully', async () => {
       const externalCtx = { close: vi.fn() } as any;
       await provider.closeContext(externalCtx);
       expect(externalCtx.close).not.toHaveBeenCalled();
    });

    it('should handle errors during context or browser closing and log them', async () => {
      const providerWithLogger = new BrowserProvider({ fs: mockFs, path: mockPath, config, logger: mockLogger });
      const ctx = await providerWithLogger.getHeadfulContext();
      
      vi.mocked(ctx.close!).mockRejectedValue(new Error('fail context'));
      vi.mocked(mockBrowser.close).mockRejectedValue(new Error('fail browser'));

      await providerWithLogger.closeContext(ctx);
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Error al cerrar el contexto: fail context'));
    });

    it('should handle errors in disconnected listener', async () => {
      const providerWithLogger = new BrowserProvider({ fs: mockFs, path: mockPath, config, logger: mockLogger });
      const mockBrowserInstance = createMockBrowser();
      let disconnectCb: any;
      mockBrowserInstance.on.mockImplementation((event: string, cb: any) => {
        if (event === 'disconnected') disconnectCb = cb;
      });
      (chromium.launch as any).mockResolvedValue(mockBrowserInstance);

      const ctx = await providerWithLogger.getHeadfulContext();
      // Force context browser() to throw to hit line 88
      vi.spyOn(ctx, 'browser').mockImplementation(() => { throw new Error('Dead context'); });

      if (disconnectCb) disconnectCb();
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Canal de comunicación'));
    });

    it('should respond to abort signal during context lifecycle', async () => {
      const providerWithLogger = new BrowserProvider({ fs: mockFs, path: mockPath, config, logger: mockLogger });
      const controller = new AbortController();
      await AbortContext.run(controller.signal, async () => {
          await providerWithLogger.getHeadfulContext();
          controller.abort();
          expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Señal de aborto recibida'));
      });
    });

    it('should handle already aborted signal in getContext', async () => {
      const providerWithLogger = new BrowserProvider({ fs: mockFs, path: mockPath, config, logger: mockLogger });
      const abortedSignal = { aborted: true } as AbortSignal;
      
      await AbortContext.run(abortedSignal, async () => {
          const ctx = await providerWithLogger.getHeadfulContext();
          expect(ctx).toBeDefined();
          // Since it's already aborted, the context should be closed immediately
          // but there is no specific log for the immediate path in production code.
      });
    });

    it('should handle and log browser close errors in closeContext', async () => {
        const providerWithLogger = new BrowserProvider({ fs: mockFs, path: mockPath, config, logger: mockLogger });
        const mockBrowserInstance = createMockBrowser();
        (chromium.launch as any).mockResolvedValue(mockBrowserInstance);
    
        const ctx = await providerWithLogger.getHeadfulContext();
    
        // Force contexts().length === 0 in closeContext by mocking contexts()
        vi.spyOn(mockBrowserInstance as any, 'contexts').mockReturnValue([]);
        vi.spyOn(mockBrowserInstance as any, 'close').mockRejectedValue(new Error('Browser shutdown failed'));
    
        await providerWithLogger.closeContext(ctx);
        expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Error al cerrar el navegador (headful): Browser shutdown failed'));
      });
  });
});

