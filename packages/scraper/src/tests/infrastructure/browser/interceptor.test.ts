import fs from 'fs';
import path from 'path';
import { Page, Request, Response } from 'playwright';
import { beforeEach, describe, expect, it, Mocked, vi } from 'vitest';

import { setupInterceptor } from '@platform/browser/interceptor';

vi.mock('fs');
vi.mock('path', async () => {
    const actual = await vi.importActual<typeof import('path')>('path');
    return {
        default: {
            ...actual,
        }
    };
});

vi.mock('@my-offline-lms/core', () => {
    return {
        ConsoleLogger: class {
            withContext() { return this; }
            info() { }
            warn() { }
            error() { }
            debug() { }
        }
    };
});

describe('setupInterceptor', () => {
    let mockPage: Mocked<Page>;
    let mockResponse: Mocked<Response>;
    let mockRequest: Mocked<Request>;

    beforeEach(() => {
        vi.clearAllMocks();

        mockPage = {
            on: vi.fn(),
        } as unknown as Mocked<Page>;

        mockRequest = {
            method: vi.fn().mockReturnValue('GET'),
        } as unknown as Mocked<Request>;

        mockResponse = {
            url: vi.fn(),
            headers: vi.fn(),
            request: vi.fn().mockReturnValue(mockRequest),
            status: vi.fn().mockReturnValue(200),
            json: vi.fn(),
        } as unknown as Mocked<Response>;
    });

    it('should create default intercepted directory if no options provided', () => {
        vi.mocked(fs.existsSync).mockReturnValue(false);
        const targetDir = setupInterceptor(mockPage);

        expect(fs.mkdirSync).toHaveBeenCalledWith(targetDir, { recursive: true });
        expect(targetDir).toContain('intercepted'); // Check fallback
    });

    it('should create custom target directory if options provided', () => {
        vi.mocked(fs.existsSync).mockReturnValue(false);
        const options = { prefix: 'test', execTimestamp: 12345 };
        const targetDir = setupInterceptor(mockPage, options);

        expect(targetDir).toContain('test_12345');
        expect(fs.mkdirSync).toHaveBeenCalledWith(targetDir, { recursive: true });
    });

    it('should not recreate directory if it already exists', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        setupInterceptor(mockPage);

        expect(fs.mkdirSync).not.toHaveBeenCalled();
    });

    it('should attach a response listener to the page', () => {
        setupInterceptor(mockPage);
        expect(mockPage.on).toHaveBeenCalledWith('response', expect.any(Function));
    });

    it('should save JSON payload when response URL matches intercept criteria', async () => {
        const targetDir = setupInterceptor(mockPage);
        const responseHandler = mockPage.on.mock.calls[0][1] as unknown as ((response: Response) => Promise<void>);

        // Simulate a learning path JSON response
        mockResponse.url.mockReturnValue('https://example.com/api/learning-paths/123');
        mockResponse.headers.mockReturnValue({ 'content-type': 'application/json' });
        const mockJsonData = { id: 123, title: 'Test Path' };
        mockResponse.json.mockResolvedValue(mockJsonData);

        await responseHandler(mockResponse);

        // Verify that the file was written
        expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
        const writeCallArgs = vi.mocked(fs.writeFileSync).mock.calls[0];

        expect(writeCallArgs[0]).toContain(targetDir);
        expect(writeCallArgs[0]).toContain('api_learning_paths_123');

        const writtenData = JSON.parse(writeCallArgs[1] as string);
        expect(writtenData.url).toBe('https://example.com/api/learning-paths/123');
        expect(writtenData.method).toBe('GET');
        expect(writtenData.status).toBe(200);
        expect(writtenData.data).toEqual(mockJsonData);
    });

    it('should ignore non-JSON responses', async () => {
        setupInterceptor(mockPage);
        const responseHandler = mockPage.on.mock.calls[0][1] as unknown as ((response: Response) => Promise<void>);

        // Simulate an image response
        mockResponse.url.mockReturnValue('https://example.com/api/learning-paths/123.png');
        mockResponse.headers.mockReturnValue({ 'content-type': 'image/png' });

        await responseHandler(mockResponse);

        expect(fs.writeFileSync).not.toHaveBeenCalled();
    });

    it('should safely catch errors if response body cannot be parsed as JSON', async () => {
        setupInterceptor(mockPage);
        const responseHandler = mockPage.on.mock.calls[0][1] as unknown as ((response: Response) => Promise<void>);

        // Simulate JSON type but non-JSON body (e.g. malformed or empty)
        mockResponse.url.mockReturnValue('https://example.com/api/learning-paths/123');
        mockResponse.headers.mockReturnValue({ 'content-type': 'application/json' });
        mockResponse.json.mockRejectedValue(new Error('Invalid JSON'));

        // Should not throw
        await expect(responseHandler(mockResponse)).resolves.not.toThrow();

        // But should not write file
        expect(fs.writeFileSync).not.toHaveBeenCalled();
    });
});
