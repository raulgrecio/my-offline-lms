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

  const mockBrowser = {
    newContext: vi.fn().mockResolvedValue(mockContext),
    on: vi.fn(),
    close: vi.fn().mockResolvedValue(undefined),
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
    (chromium.launch as any).mockResolvedValue(mockBrowser);
    provider = new BrowserProvider({
      fs: mockFs,
      path: mockPath,
      config
    });
  });

  it('should launch browser only once for multiple contexts', async () => {
    await provider.getHeadfulContext();
    await provider.getHeadfulContext();

    expect(chromium.launch).toHaveBeenCalledTimes(1);
    expect(mockBrowser.newContext).toHaveBeenCalledTimes(2);
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
    mockBrowser.on.mockImplementation((event, cb) => {
      if (event === 'disconnected') disconnectCb = cb;
    });

    await provider.getHeadfulContext();
    if (disconnectCb) disconnectCb();

    // After manual disconnect, next request should launch a new one
    await provider.getHeadfulContext();
    expect(chromium.launch).toHaveBeenCalledTimes(2);
  });
});
