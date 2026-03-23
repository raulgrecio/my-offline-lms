import { ILogger } from '@my-offline-lms/core/logging';

import { IInterceptedDataRepository } from "@features/platform-sync/domain/ports/IInterceptedDataRepository";
import { IInterceptedDataRepositoryFactory } from "@features/platform-sync/domain/ports/IInterceptedDataRepositoryFactory";

import { DiskInterceptedDataRepository } from "./DiskInterceptedDataRepository";

export class DiskInterceptedDataRepositoryFactory implements IInterceptedDataRepositoryFactory {
  constructor(private readonly logger: ILogger) { }

  create(baseDir?: string): IInterceptedDataRepository {
    return new DiskInterceptedDataRepository({ baseDir, logger: this.logger });
  }
}
