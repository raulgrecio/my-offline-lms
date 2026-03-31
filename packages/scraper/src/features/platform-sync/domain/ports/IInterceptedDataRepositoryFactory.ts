import type { IInterceptedDataRepository } from '@scraper/features/platform-sync/domain/ports/IInterceptedDataRepository';

export interface IInterceptedDataRepositoryFactory {
  create(baseDir?: string): IInterceptedDataRepository;
}
