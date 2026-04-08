import { describe, it, expect, vi, beforeEach } from 'vitest';

import { type ILogger } from '@core/logging';

import { type IAuthSessionStorage, ValidateAuthSession } from '@scraper/features/auth-session';
import { type IAuthValidator } from '@scraper/features/auth-session/domain/ports/IAuthValidator';

describe('ValidateAuthSession', () => {
  let authStorageMock: IAuthSessionStorage;
  let validatorMock: IAuthValidator;
  let loggerMock: ILogger;
  let useCase: ValidateAuthSession;

  beforeEach(() => {
    authStorageMock = {
      getCookies: vi.fn().mockResolvedValue([]),
      getAuthFile: vi.fn(),
      getCookiesFile: vi.fn(),
      ensureAuthDir: vi.fn(),
      saveCookies: vi.fn(),
    } as any;
    validatorMock = {
      isValid: vi.fn(),
    } as any;
    loggerMock = {
      warn: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
      withContext: vi.fn().mockReturnThis(),
    } as any;
    useCase = new ValidateAuthSession({
      authStorage: authStorageMock,
      validator: validatorMock,
      logger: loggerMock,
    });
  });

  it('should return true if session is valid', async () => {
    vi.mocked(validatorMock.isValid).mockReturnValue(true);
    const result = await useCase.execute();
    expect(result).toBe(true);
    expect(loggerMock.warn).not.toHaveBeenCalled();
  });

  it('should return false and log a warning if session is invalid', async () => {
    vi.mocked(validatorMock.isValid).mockReturnValue(false);
    const result = await useCase.execute();
    expect(result).toBe(false);
    expect(loggerMock.warn).toHaveBeenCalledWith(
      expect.stringContaining("Sesión expirada o no encontrada")
    );
  });
});
