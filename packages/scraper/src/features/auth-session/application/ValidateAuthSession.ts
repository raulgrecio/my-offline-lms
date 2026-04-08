import { type ILogger } from '@core/logging';

import { type IUseCase } from '@scraper/features/shared';

import { type IAuthSessionStorage } from "../domain/ports/IAuthSessionStorage";
import { type IAuthValidator } from "../domain/ports/IAuthValidator";

export interface ValidateAuthSessionOptions {
  authStorage: IAuthSessionStorage;
  validator: IAuthValidator;
  logger: ILogger;
}

export class ValidateAuthSession implements IUseCase<void, boolean> {
  private authStorage: IAuthSessionStorage;
  private validator: IAuthValidator;
  private logger: ILogger;

  constructor(options: ValidateAuthSessionOptions) {
    this.authStorage = options.authStorage;
    this.validator = options.validator;
    this.logger = options.logger.withContext("ValidateAuthSession");
  }

  async execute(): Promise<boolean> {
    const cookies = await this.authStorage.getCookies();
    const isValid = this.validator.isValid(cookies);

    if (!isValid) {
      this.logger.warn("Sesión expirada o no encontrada. Por favor, ejecuta 'pnpm cli login' de nuevo.");
    }

    return isValid;
  }
}
