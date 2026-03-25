import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ValidateAuthSession } from '../../../../src/features/auth-session/application/ValidateAuthSession';
import { IAuthSessionStorage } from '../../../../src/features/auth-session/domain/ports/IAuthSessionStorage';
import { ILogger } from '@my-offline-lms/core/logging';

describe('ValidateAuthSession', () => {
  let authStorageMock: IAuthSessionStorage;
  let loggerMock: ILogger;
  let useCase: ValidateAuthSession;

  beforeEach(() => {
    authStorageMock = {
      isValidSession: vi.fn(),
      getAuthFile: vi.fn(),
      getCookiesFile: vi.fn(),
      ensureAuthDir: vi.fn(),
      saveCookies: vi.fn(),
    };
    loggerMock = {
      warn: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
      withContext: vi.fn().mockReturnThis(),
    } as any;
    useCase = new ValidateAuthSession({
      authStorage: authStorageMock,
      logger: loggerMock,
    });
  });

  it('should return true if session is valid', async () => {
    vi.mocked(authStorageMock.isValidSession).mockResolvedValue(true);
    const result = await useCase.execute();
    expect(result).toBe(true);
    expect(loggerMock.warn).not.toHaveBeenCalled();
  });

  it('should return false and log a warning if session is invalid', async () => {
    vi.mocked(authStorageMock.isValidSession).mockResolvedValue(false);
    const result = await useCase.execute();
    expect(result).toBe(false);
    expect(loggerMock.warn).toHaveBeenCalledWith(
        expect.stringContaining("Sesión expirada o no encontrada")
    );
  });
});
