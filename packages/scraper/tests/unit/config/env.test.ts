import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import dotenv from 'dotenv';

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
  default: {
    config: vi.fn(),
  },
}));

describe('Environment Configuration', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalPlatformBaseUrl = process.env.PLATFORM_BASE_URL;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    // Restore defaults for each test
    process.env.NODE_ENV = 'test';
    process.env.PLATFORM_BASE_URL = 'http://mock-platform.com';
  });

  // Restore real process.env after all tests
  afterAll(() => {
    process.env.NODE_ENV = originalNodeEnv;
    process.env.PLATFORM_BASE_URL = originalPlatformBaseUrl;
  });

  it('should load .env.test when NODE_ENV is test', async () => {
    process.env.NODE_ENV = 'test';

    await import('@scraper/config/env');

    expect(dotenv.config).toHaveBeenCalledWith({ path: '.env.test' });
  });

  it('should load default .env when NODE_ENV is not test', async () => {
    process.env.NODE_ENV = 'development';

    await import('@scraper/config/env');

    expect(dotenv.config).toHaveBeenCalledWith();
  });

  it('should log error but not exit in test environment even if invalid', async () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      return undefined as never;
    });

    process.env.PLATFORM_BASE_URL = 'not-a-url';
    process.env.NODE_ENV = 'test';

    await import('@scraper/config/env');

    expect(exitSpy).not.toHaveBeenCalled();
    exitSpy.mockRestore();
  });

  it('should call process.exit(1) on invalid env when NOT in test mode', async () => {
    process.env.NODE_ENV = 'production';
    process.env.PLATFORM_BASE_URL = 'not-a-url';

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      // Throw to stop execution after the exit call in the module
      throw new Error('process.exit(1) called');
    });

    try {
      await import('@scraper/config/env');
    } catch (e: any) {
      // Expected throw from our mock exit
      expect(e.message).toBe('process.exit(1) called');
    }

    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
  });

  it('should export an empty object as env if validation fails to avoid crashes', async () => {
    process.env.PLATFORM_BASE_URL = 'not-a-url';
    process.env.NODE_ENV = 'test';

    const { env } = await import('@scraper/config/env');

    expect(env).toEqual({});
  });
});