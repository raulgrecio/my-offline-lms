import { IInterceptedDataRepository } from "./IInterceptedDataRepository";

export interface IInterceptedDataRepositoryFactory {
  create(baseDir?: string): IInterceptedDataRepository;
}
