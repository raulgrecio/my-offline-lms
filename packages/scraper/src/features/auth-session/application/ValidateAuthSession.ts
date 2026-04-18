import { type ILogger } from '@core/logging';

import { type IUseCase } from '@scraper/features/shared';

import { type IAuthSessionStorage } from "../domain/ports/IAuthSessionStorage";
import { type IAuthValidator } from "../domain/ports/IAuthValidator";

export interface ValidateAuthSessionInput {
  forceDeep?: boolean;
}

export interface ValidateAuthSessionOptions {
  authStorage: IAuthSessionStorage;
  validator: IAuthValidator;
  logger: ILogger;
}

export class ValidateAuthSession implements IUseCase<ValidateAuthSessionInput | void, boolean> {
  private authStorage: IAuthSessionStorage;
  private validator: IAuthValidator;
  private logger: ILogger;

  // Estado de cacheo interno
  private lastDeepCheck: number = 0;
  private lastVersionChecked: number = 0;
  private cachedAuthResult: boolean | null = null;

  constructor(options: ValidateAuthSessionOptions) {
    this.authStorage = options.authStorage;
    this.validator = options.validator;
    this.logger = options.logger.withContext("ValidateAuthSession");
  }

  async execute(input?: ValidateAuthSessionInput | void): Promise<boolean> {
    const now = Date.now();
    const CACHE_TTL = 5 * 60 * 1000; // 5 minutos
    const storageVersion = await this.authStorage.getStorageVersion();

    const forceDeep = input && typeof input === 'object' && input.forceDeep;

    // 1. POLÍTICA "NO MOLESTAR": Si ya sabemos que es inválido y el archivo no ha cambiado, no consultamos
    if (this.cachedAuthResult === false && storageVersion === this.lastVersionChecked && !forceDeep) {
      return false;
    }

    const cookies = await this.authStorage.getCookies();
    const isValidStatically = this.validator.isValid(cookies);

    // 2. Determinar si necesitamos una validación profunda (deep check)
    const versionChanged = storageVersion !== this.lastVersionChecked;
    const ttlExpired = (now - this.lastDeepCheck) > CACHE_TTL;
    const shouldDeepCheck = forceDeep ||
      versionChanged ||
      this.cachedAuthResult === null ||
      ttlExpired;

    if (shouldDeepCheck && isValidStatically) {
      if (forceDeep) this.logger.debug?.("Validación profunda: forzada por el usuario.");
      else if (versionChanged) this.logger.debug?.(`Validación profunda: el archivo de sesión ha cambiado (${this.lastVersionChecked} -> ${storageVersion}).`);
      else if (this.cachedAuthResult === null) this.logger.debug?.("Validación profunda: caché inicial.");
      else if (ttlExpired) this.logger.debug?.("Validación profunda: TTL de caché expirado.");

      this.logger.info("Realizando validación profunda de la sesión...");
      const result = await this.validator.validate(cookies);
      
      this.cachedAuthResult = result;
      this.lastDeepCheck = now;
      this.lastVersionChecked = storageVersion;
      
      return result;
    }

    // Actualizamos la versión chequeada incluso si no hubo validación profunda para evitar bucles si es inválido estáticamente
    this.lastVersionChecked = storageVersion;

    // 3. Si no toca deep check, devolvemos el resultado cacheado o el estático rápido
    return this.cachedAuthResult ?? isValidStatically;
  }
}
