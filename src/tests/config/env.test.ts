import { describe, it, expect, vi } from 'vitest';

describe('Environment Configuration', () => {

  it('should log error but not exit in test environment', async () => {

    const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, 'exit');

    const originalEnv = process.env.PLATFORM_BASE_URL;

    process.env.PLATFORM_BASE_URL = 'not-a-url';

    await import('../../config/env');

    expect(mockConsoleError).toHaveBeenCalled();
    expect(exitSpy).not.toHaveBeenCalled();

    // Reset
    process.env.PLATFORM_BASE_URL = originalEnv;

    mockConsoleError.mockRestore();
    exitSpy.mockRestore();
  });

  it('should validate env vars', async () => {

    vi.resetModules();

    const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    process.env.PLATFORM_BASE_URL = 'not-a-url';

    await import('../../config/env');

    expect(mockConsoleError).toHaveBeenCalled();

    mockConsoleError.mockRestore();

    });
});