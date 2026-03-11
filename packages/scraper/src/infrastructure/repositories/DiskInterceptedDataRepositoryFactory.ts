import { IInterceptedDataRepository } from "@domain/repositories/IInterceptedDataRepository";
import { IInterceptedDataRepositoryFactory } from "@domain/repositories/IInterceptedDataRepositoryFactory";
import { ILogger } from "@domain/services/ILogger";
import { DiskInterceptedDataRepository } from "./DiskInterceptedDataRepository";

export class DiskInterceptedDataRepositoryFactory implements IInterceptedDataRepositoryFactory {
  constructor(private readonly logger: ILogger) {}

  create(baseDir?: string): IInterceptedDataRepository {
    return new DiskInterceptedDataRepository({ baseDir, logger: this.logger });
  }
}
