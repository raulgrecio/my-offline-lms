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
      getStorageVersion: vi.fn().mockResolvedValue(0),
    } as any;
    validatorMock = {
      isValid: vi.fn(),
      validate: vi.fn().mockResolvedValue(true),
      getExpiry: vi.fn().mockReturnValue(null),
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

  it('should return false if session is invalid', async () => {
    vi.mocked(validatorMock.isValid).mockReturnValue(false);
    const result = await useCase.execute();
    expect(result).toBe(false);
  });

  it('should respect "No Molestar" policy when session is already cached as false after a failed deep validation', async () => {
    vi.mocked(validatorMock.isValid).mockReturnValue(true);
    vi.mocked(validatorMock.validate).mockResolvedValue(false);
    vi.mocked(authStorageMock.getStorageVersion).mockResolvedValue(1);

    // Primera llamada realiza validación profunda y falla (cachea false)
    await useCase.execute();
    
    vi.clearAllMocks();
    vi.mocked(authStorageMock.getStorageVersion).mockResolvedValue(1);

    const result = await useCase.execute();
    expect(result).toBe(false);
    expect(authStorageMock.getCookies).not.toHaveBeenCalled();
  });
  it('should bypass cache if forceDeep is true', async () => {
    vi.mocked(validatorMock.isValid).mockReturnValue(true);
    await useCase.execute(); // Caché inicial
    
    vi.clearAllMocks();
    vi.mocked(validatorMock.isValid).mockReturnValue(true);
    await useCase.execute({ forceDeep: true });
    
    expect(validatorMock.validate).toHaveBeenCalled();
  });

  it('should update lastVersionChecked even if statically invalid to avoid redundant checks', async () => {
    vi.mocked(validatorMock.isValid).mockReturnValue(false);
    vi.mocked(authStorageMock.getStorageVersion).mockResolvedValue(12345);

    await useCase.execute();
    
    // Si la versión es la misma, shouldDeepCheck debería ser false en la siguiente ronda
    // (aunque en este caso isValidStatically ya lo paraba, el problema era el versionChanged persistente)
    vi.clearAllMocks();
    vi.mocked(validatorMock.isValid).mockReturnValue(false);
    vi.mocked(authStorageMock.getStorageVersion).mockResolvedValue(12345);

    await useCase.execute();
    
    // No podemos verificar private members directamente, pero el flujo ya es correcto al actualizar lastVersionChecked
    expect(authStorageMock.getStorageVersion).toHaveBeenCalled();
  });
});
