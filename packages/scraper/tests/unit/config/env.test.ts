import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import dotenv from 'dotenv';
import path from 'path';

// Mock platform logger to avoid noisy output
vi.mock('@scraper/platform/logging', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock dotenv to verify it's called with the right paths
vi.mock('dotenv', () => ({
  config: vi.fn(),
  default: {
    config: vi.fn(),
  },
}));

describe('Environment Configuration', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalPlatformBaseUrl = process.env.PLATFORM_BASE_URL;

  beforeEach(() => {
    vi.clearAllMocks();
    // Clear relevant process.env to force loadScraperEnv to actually call dotenv
    delete process.env.PLATFORM_BASE_URL;
    delete process.env.PLATFORM_GUEST_EMAIL;
    delete process.env.SCRAPER_LOGIN_URL;
    delete process.env.DATA_DIR;

    vi.resetModules();
  });

  // Restore real process.env after all tests
  afterAll(() => {
    process.env.NODE_ENV = originalNodeEnv;
    process.env.PLATFORM_BASE_URL = originalPlatformBaseUrl;
  });

  it('should load specified path if provided', async () => {
    const { loadScraperEnv } = await import('@scraper/config/env');
    const testPath = '/custom/.env.test';

    // Mock exit because custom path env might be invalid
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => { return undefined as never; });
    
    loadScraperEnv({ path: testPath });
    expect(dotenv.config).toHaveBeenCalledWith({ path: testPath });
    
    exitSpy.mockRestore();
  });

  it('should load default .env when no path is provided', async () => {
    const { loadScraperEnv } = await import('@scraper/config/env');
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => { return undefined as never; });

    loadScraperEnv();
    expect(dotenv.config).toHaveBeenCalledWith({ path: expect.stringContaining('.env') });
    expect(dotenv.config).not.toHaveBeenCalledWith({ path: expect.stringContaining('.env.test') });
    
    exitSpy.mockRestore();
  });

  it('should call process.exit(1) on invalid env', async () => {
    process.env.PLATFORM_BASE_URL = 'not-a-url';

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      // Throw to stop execution after the exit call in the module
      throw new Error('process.exit(1) called');
    });

    const { loadScraperEnv } = await import('@scraper/config/env');
    try {
      loadScraperEnv();
    } catch (e: any) {
      // Expected throw from our mock exit
      expect(e.message).toBe('process.exit(1) called');
    }

    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
  });

  it('should export an empty object as env if validation fails to avoid crashes (when exit is mocked)', async () => {
    process.env.PLATFORM_BASE_URL = 'not-a-url';
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => { return undefined as never; });

    const { loadScraperEnv } = await import('@scraper/config/env');
    const env = loadScraperEnv();
    expect(env).toEqual({});
    exitSpy.mockRestore();
  });
});