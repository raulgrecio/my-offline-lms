import { type ILogger } from '@core/logging';

import { type IUseCase } from '@scraper/features/shared/domain/ports/IUseCase';
import { type IAuthSessionStorage } from "@scraper/features/auth-session/domain/ports/IAuthSessionStorage";

export interface ValidateAuthSessionOptions {
  authStorage: IAuthSessionStorage;
  logger: ILogger;
}

export class ValidateAuthSession implements IUseCase<void, boolean> {
  private authStorage: IAuthSessionStorage;
  private logger: ILogger;

  constructor(options: ValidateAuthSessionOptions) {
    this.authStorage = options.authStorage;
    this.logger = options.logger.withContext("ValidateAuthSession");
  }

  async execute(): Promise<boolean> {
    const isValid = await this.authStorage.isValidSession();

    if (!isValid) {
      this.logger.warn("Sesión expirada o no encontrada. Por favor, ejecuta 'pnpm cli login' de nuevo.");
    }

    return isValid;
  }
}
