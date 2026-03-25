import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DiskAuthSessionStorage } from '@features/auth-session/infrastructure/DiskAuthSessionStorage';

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

    expect(mockFs.writeFile).toHaveBeenCalled();
    const callArgs = vi.mocked(mockFs.writeFile).mock.calls[0];
    expect(callArgs[0]).toBe('/mock/base/dir/cookies.txt');

    const savedContent = callArgs[1] as string;
    expect(savedContent).toContain('Netscape HTTP Cookie File');
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
    const content = vi.mocked(mockFs.writeFile).mock.calls[0][1] as string;
    expect(content).toContain('a.com\tFALSE\t/\tTRUE\t0\tn\tv');
  });

  describe('isValidSession', () => {
    vi.mock('@config/env', () => ({
      env: { PLATFORM_BASE_URL: 'https://mylearn.myplatform.com' }
    }));

    it('should return false if auth file does not exist', async () => {
      const storage = new DiskAuthSessionStorage({
        fs: mockFs,
        path: mockPath,
        getAuthDir: async () => mockBaseDir
      });
      mockFs.exists.mockResolvedValue(false);
      expect(await storage.isValidSession()).toBe(false);
    });

    it('should return false if no cookies match the domain', async () => {
      const storage = new DiskAuthSessionStorage({
        fs: mockFs,
        path: mockPath,
        getAuthDir: async () => mockBaseDir
      });
      mockFs.exists.mockResolvedValue(true);
      mockFs.readFile = vi.fn().mockResolvedValue(Buffer.from(JSON.stringify({
        cookies: [{ domain: 'other.com', name: 'n', value: 'v' }]
      })));
      expect(await storage.isValidSession()).toBe(false);
    });

    it('should return false if all cookies are expired', async () => {
      const storage = new DiskAuthSessionStorage({
        fs: mockFs,
        path: mockPath,
        getAuthDir: async () => mockBaseDir
      });
      mockFs.exists.mockResolvedValue(true);
      mockFs.readFile = vi.fn().mockResolvedValue(Buffer.from(JSON.stringify({
        cookies: [{ domain: 'myplatform.com', name: 'n', value: 'v', expires: (Date.now() / 1000) - 100 }]
      })));
      expect(await storage.isValidSession()).toBe(false);
    });

    it('should return true if at least one cookie is valid', async () => {
      const storage = new DiskAuthSessionStorage({
        fs: mockFs,
        path: mockPath,
        getAuthDir: async () => mockBaseDir
      });
      mockFs.exists.mockResolvedValue(true);
      mockFs.readFile = vi.fn().mockResolvedValue(Buffer.from(JSON.stringify({
        cookies: [
          { domain: '.myplatform.com', name: 'n', value: 'v', expires: (Date.now() / 1000) + 3600 },
          { domain: 'myplatform.com', name: 'n2', value: 'v2', expires: -1 }
        ]
      })));
      expect(await storage.isValidSession()).toBe(true);
    });
  });
});
