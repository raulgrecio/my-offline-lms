import { type IFileSystem, type IPath } from "@core/filesystem";
import { type ILogger } from '@core/logging';

import { getInterceptedDir } from "@scraper/config/paths";
import { type IInterceptedDataRepository } from "@scraper/features/platform-sync/domain/ports/IInterceptedDataRepository";
import { type IInterceptedDataRepositoryFactory } from "@scraper/features/platform-sync/domain/ports/IInterceptedDataRepositoryFactory";

import { DiskInterceptedDataRepository } from "./DiskInterceptedDataRepository";

export class DiskInterceptedDataRepositoryFactory implements IInterceptedDataRepositoryFactory {
  constructor(
    private readonly fs: IFileSystem,
    private readonly path: IPath,
    private readonly logger: ILogger
  ) { }

  create(baseDir?: string): IInterceptedDataRepository {
    return new DiskInterceptedDataRepository({
      fs: this.fs,
      path: this.path,
      getInterceptedDir,
      baseDir,
      logger: this.logger
    });
  }
}
