import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ILogger } from '@my-offline-lms/core';

import { AuthSession } from '@features/auth-session/application/AuthSession';

vi.mock('readline', () => ({
    default: {
        emitKeypressEvents: vi.fn(),
    }
}));

describe('AuthSession Use Case', () => {
    const mockBrowserProvider = {
        getHeadfulContext: vi.fn(),
        close: vi.fn(),
    } as any;

    const mockAuthStorage = {
        getAuthFile: vi.fn().mockReturnValue('/mock/state.json'),
        getCookiesFile: vi.fn(),
        saveCookies: vi.fn(),
        ensureAuthDir: vi.fn(),
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
            close: vi.fn().mockResolvedValue(undefined),
        } as any;
        const mockContext = {
            newPage: vi.fn().mockResolvedValue(mockPage),
            close: vi.fn().mockResolvedValue(undefined),
            storageState: vi.fn().mockResolvedValue({}),
            cookies: vi.fn().mockResolvedValue([{ name: 'c1', value: 'v1' }])
        } as any;
        mockBrowserProvider.getHeadfulContext.mockResolvedValue(mockContext);

        const promise = useCase.interactiveLogin('http://base-url');

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

    it('should throw error if context creation fails', async () => {
        mockBrowserProvider.getHeadfulContext.mockResolvedValue(null);
        // We need to bypass the readline setup if context fails, 
        // but current code will fail at `context.newPage()`
        await expect(useCase.interactiveLogin('http://url')).rejects.toThrow();
    });
});
