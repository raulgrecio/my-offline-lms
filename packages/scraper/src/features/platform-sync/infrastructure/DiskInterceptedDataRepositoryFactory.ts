import { IInterceptedDataRepository } from "@features/platform-sync/domain/ports/IInterceptedDataRepository";
import { IInterceptedDataRepositoryFactory } from "@features/platform-sync/domain/ports/IInterceptedDataRepositoryFactory";
import { ILogger } from "@platform/logging/ILogger";
import { DiskInterceptedDataRepository } from "./DiskInterceptedDataRepository";

export class DiskInterceptedDataRepositoryFactory implements IInterceptedDataRepositoryFactory {
  constructor(private readonly logger: ILogger) {}

  create(baseDir?: string): IInterceptedDataRepository {
    return new DiskInterceptedDataRepository({ baseDir, logger: this.logger });
  }
}
