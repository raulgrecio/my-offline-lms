import { Page, Request, Response } from 'playwright';
import { beforeEach, describe, expect, it, Mocked, vi } from 'vitest';

import { BrowserInterceptor } from '@scraper/platform/browser';

describe('BrowserInterceptor', () => {
  let mockPage: Mocked<Page>;
  let mockResponse: Mocked<Response>;
  let mockRequest: Mocked<Request>;
  let interceptor: BrowserInterceptor;
  const mockFs = {
    mkdir: vi.fn(),
    writeFile: vi.fn(),
    exists: vi.fn().mockResolvedValue(true),
  } as any;
  const mockPath = {
    join: vi.fn((...args) => args.join('/')),
  } as any;

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

    interceptor = new BrowserInterceptor({
      fs: mockFs,
      path: mockPath,
      logger: {
        withContext: vi.fn().mockReturnThis(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn()
      } as any,
      getInterceptedDir: async () => '/mock/intercepted'
    });
  });

  it('should create custom target directory when setup is called', async () => {
    mockFs.exists.mockResolvedValue(false);
    const targetDir = await interceptor.setup(mockPage);

    expect(mockFs.mkdir).toHaveBeenCalledWith(targetDir, { recursive: true });
    expect(targetDir).toContain('/mock/intercepted');
  });

  it('should attach a response listener to the page', async () => {
    await interceptor.setup(mockPage);
    expect(mockPage.on).toHaveBeenCalledWith('response', expect.any(Function));
  });

  it('should save JSON payload when response URL matches intercept criteria', async () => {
    const targetDir = await interceptor.setup(mockPage);
    const responseHandler = mockPage.on.mock.calls[0][1] as unknown as ((response: Response) => Promise<void>);

    // Simulate a learning path JSON response
    mockResponse.url.mockReturnValue('https://example.com/api/learning-paths/123');
    mockResponse.headers.mockReturnValue({ 'content-type': 'application/json' });
    const mockJsonData = { id: 123, title: 'Test Path' };
    mockResponse.json.mockResolvedValue(mockJsonData);

    await responseHandler(mockResponse);

    // Verify that the file was written
    expect(mockFs.writeFile).toHaveBeenCalledTimes(1);
    const writeCallArgs = vi.mocked(mockFs.writeFile).mock.calls[0];

    expect(writeCallArgs[0]).toContain(targetDir);
    expect(writeCallArgs[0]).toContain('api_learning_paths_123');

    const writtenData = JSON.parse(writeCallArgs[1] as string);
    expect(writtenData.url).toBe('https://example.com/api/learning-paths/123');
    expect(writtenData.method).toBe('GET');
    expect(writtenData.status).toBe(200);
    expect(writtenData.data).toEqual(mockJsonData);
  });

  it('should ignore non-JSON responses', async () => {
    await interceptor.setup(mockPage);
    const responseHandler = mockPage.on.mock.calls[0][1] as unknown as ((response: Response) => Promise<void>);

    // Simulate an image response
    mockResponse.url.mockReturnValue('https://example.com/api/learning-paths/123.png');
    mockResponse.headers.mockReturnValue({ 'content-type': 'image/png' });

    await responseHandler(mockResponse);

    expect(mockFs.writeFile).not.toHaveBeenCalled();
  });

  it('should safely catch errors if response body cannot be parsed as JSON', async () => {
    await interceptor.setup(mockPage);
    const responseHandler = mockPage.on.mock.calls[0][1] as unknown as ((response: Response) => Promise<void>);

    // Simulate JSON type but non-JSON body (e.g. malformed or empty)
    mockResponse.url.mockReturnValue('https://example.com/api/learning-paths/123');
    mockResponse.headers.mockReturnValue({ 'content-type': 'application/json' });
    mockResponse.json.mockRejectedValue(new Error('Invalid JSON'));

    // Should not throw
    await expect(responseHandler(mockResponse)).resolves.not.toThrow();

    // But should not write file
    expect(mockFs.writeFile).not.toHaveBeenCalled();
  });

  it('should use prefix and timestamp for target directory if options provided', async () => {
    const timestamp = 123456789;
    const targetDir = await interceptor.setup(mockPage, { prefix: 'test', execTimestamp: timestamp });
    expect(targetDir).toBe(`/mock/intercepted/test_${timestamp}`);
  });

  it('should sanitize URLs with strange characters for filenames', async () => {
    await interceptor.setup(mockPage);
    const responseHandler = mockPage.on.mock.calls[0][1] as any;

    mockResponse.url.mockReturnValue('https://example.com/api/v1/user.details?id=123');
    mockResponse.headers.mockReturnValue({ 'content-type': 'application/json' });
    mockResponse.json.mockResolvedValue({});

    await responseHandler(mockResponse);

    const filename = vi.mocked(mockFs.writeFile).mock.calls[0][0];
    expect(filename).toContain('api_v1_user_details'); // Sanitized
  });

  it('should handle extreme URLs for sanitizing (triple slashes, trailing slashes, root only)', async () => {
    await interceptor.setup(mockPage);
    const responseHandler = mockPage.on.mock.calls[0][1] as any;

    // Root only
    mockResponse.url.mockReturnValue('https://example.com/');
    mockResponse.headers.mockReturnValue({ 'content-type': 'application/json' });
    mockResponse.json.mockResolvedValue({});
    await responseHandler(mockResponse);
    let filename = vi.mocked(mockFs.writeFile).mock.calls[0][0];
    expect(filename).not.toContain('__'); // No double underscores
    expect(filename).not.toMatch(/_$/); // No trailing underscore

    // Triple slashes
    mockResponse.url.mockReturnValue('https://example.com///api///');
    await responseHandler(mockResponse);
    filename = vi.mocked(mockFs.writeFile).mock.calls[1][0];
    expect(filename).toContain('_api.json'); // Clean
  });
});

