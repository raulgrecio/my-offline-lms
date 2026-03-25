import { type IFileSystem, type IPath } from "@my-offline-lms/core/filesystem";
import { type ILogger } from '@my-offline-lms/core/logging';

import { getInterceptedDir } from "@config/paths";
import { IInterceptedDataRepository } from "@features/platform-sync/domain/ports/IInterceptedDataRepository";
import { IInterceptedDataRepositoryFactory } from "@features/platform-sync/domain/ports/IInterceptedDataRepositoryFactory";

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
