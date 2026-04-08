import { describe, it, expect, vi, beforeEach } from 'vitest';

import { DiskAuthSessionStorage } from '@scraper/features/auth-session';

vi.mock('path', async () => {
  const actual = await vi.importActual<typeof import('path')>('path');
  return {
    default: {
      ...actual,
      resolve: vi.fn((...args) => actual.resolve(...args)),
      join: vi.fn((...args) => actual.join(...args))
    }
  };
});

describe('DiskAuthSessionStorage', () => {
  const mockBaseDir = '/mock/base/dir';
  const mockFs = {
    exists: vi.fn().mockResolvedValue(true),
    mkdir: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue(undefined),
  } as any;
  const mockPath = {
    join: vi.fn((...args) => args.join('/')),
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize paths correctly with a base directory', async () => {
    const storage = new DiskAuthSessionStorage({
      fs: mockFs,
      path: mockPath,
      getAuthDir: async () => '/never/called',
      baseDir: mockBaseDir
    });
    expect(await storage.getAuthFile()).toBe('/mock/base/dir/state.json');
    expect(await storage.getCookiesFile()).toBe('/mock/base/dir/cookies.txt');
  });

  it('should create auth directory', async () => {
    const storage = new DiskAuthSessionStorage({
      fs: mockFs,
      path: mockPath,
      getAuthDir: async () => '/never/called',
      baseDir: mockBaseDir
    });

    mockFs.exists.mockResolvedValue(false);
    await storage.ensureAuthDir();

    expect(mockFs.mkdir).toHaveBeenCalledWith(mockBaseDir, { recursive: true });
  });

  it('should format and save cookies to txt file correctly', async () => {
    const storage = new DiskAuthSessionStorage({
      fs: mockFs,
      path: mockPath,
      getAuthDir: async () => '/never/called',
      baseDir: mockBaseDir
    });

    const mockCookies = [
      { domain: '.example.com', path: '/', secure: true, expires: 1690000000, name: 'session', value: '123' },
      { domain: 'api.example.com', path: '/api', secure: false, expires: -1, name: 'track', value: 'abc' }
    ];

    await storage.saveCookies(mockCookies);

    // 1. Verificar JSON (state.json)
    expect(mockFs.writeFile).toHaveBeenCalledWith(
      '/mock/base/dir/state.json',
      expect.stringContaining('"cookies":')
    );

    // 2. Verificar Netscape (cookies.txt)
    expect(mockFs.writeFile).toHaveBeenCalledWith(
      '/mock/base/dir/cookies.txt',
      expect.stringContaining('Netscape HTTP Cookie File')
    );

    const cookiesCall = vi.mocked(mockFs.writeFile).mock.calls.find((c: string[]) => c[0] === '/mock/base/dir/cookies.txt');
    expect(cookiesCall).toBeDefined();
    const savedContent = cookiesCall![1] as string;
    expect(savedContent).toContain('.example.com\tTRUE\t/\tTRUE\t1690000000\tsession\t123');
    expect(savedContent).toContain('api.example.com\tFALSE\t/api\tFALSE\t0\ttrack\tabc');
  });

  it('should initialize using getAuthDir if no baseDir provided', async () => {
    const storage = new DiskAuthSessionStorage({
      fs: mockFs,
      path: mockPath,
      getAuthDir: async () => '/dynamic/auth/dir'
    });
    expect(await storage.getAuthFile()).toBe('/dynamic/auth/dir/state.json');
    expect(await storage.getCookiesFile()).toBe('/dynamic/auth/dir/cookies.txt');
  });

  it('should handle cookies with missing or zero expires', async () => {
    const storage = new DiskAuthSessionStorage({
      fs: mockFs,
      path: mockPath,
      getAuthDir: async () => '/mock/dir',
      baseDir: mockBaseDir
    });

    await storage.saveCookies([{ domain: 'a.com', path: '/', secure: true, name: 'n', value: 'v' }]);

    const cookiesCall = vi.mocked(mockFs.writeFile).mock.calls.find((c: string[]) => c[0] === '/mock/base/dir/cookies.txt');
    expect(cookiesCall).toBeDefined();
    const content = cookiesCall![1] as string;
    expect(content).toContain('a.com\tFALSE\t/\tTRUE\t0\tn\tv');
  });

});
