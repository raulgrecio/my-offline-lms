import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DiskAuthSessionStorage } from '@features/auth-session/infrastructure/DiskAuthSessionStorage';
import fs from 'fs';

vi.mock('fs', () => ({
    default: {
        promises: {
            mkdir: vi.fn().mockResolvedValue(undefined),
            writeFile: vi.fn().mockResolvedValue(undefined),
        },
        existsSync: vi.fn().mockReturnValue(true),
    }
}));

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

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should initialize paths correctly with a base directory', async () => {
        const storage = new DiskAuthSessionStorage(mockBaseDir);
        expect(await storage.getAuthFile()).toBe('/mock/base/dir/state.json');
        expect(await storage.getCookiesFile()).toBe('/mock/base/dir/cookies.txt');
    });

    it('should create auth directory', async () => {
        const storage = new DiskAuthSessionStorage(mockBaseDir);
        
        await storage.ensureAuthDir();
        
        expect(fs.promises.mkdir).toHaveBeenCalledWith(mockBaseDir, { recursive: true });
    });

    it('should format and save cookies to txt file correctly', async () => {
        const storage = new DiskAuthSessionStorage(mockBaseDir);
        
        const mockCookies = [
            { domain: '.example.com', path: '/', secure: true, expires: 1690000000, name: 'session', value: '123' },
            { domain: 'api.example.com', path: '/api', secure: false, expires: -1, name: 'track', value: 'abc' }
        ];

        await storage.saveCookies(mockCookies);

        expect(fs.promises.writeFile).toHaveBeenCalled();
        const callArgs = vi.mocked(fs.promises.writeFile).mock.calls[0];
        expect(callArgs[0]).toBe('/mock/base/dir/cookies.txt');
        
        const savedContent = callArgs[1] as string;
        expect(savedContent).toContain('Netscape HTTP Cookie File');
        expect(savedContent).toContain('.example.com\tTRUE\t/\tTRUE\t1690000000\tsession\t123');
        expect(savedContent).toContain('api.example.com\tFALSE\t/api\tFALSE\t0\ttrack\tabc');
    });
});
