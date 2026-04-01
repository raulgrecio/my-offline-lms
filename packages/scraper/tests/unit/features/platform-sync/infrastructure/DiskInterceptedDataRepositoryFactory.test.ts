import { describe, it, expect, vi } from 'vitest';
import { DiskInterceptedDataRepositoryFactory } from '../../../../../src/features/platform-sync/infrastructure/DiskInterceptedDataRepositoryFactory';
import { DiskInterceptedDataRepository } from '../../../../../src/features/platform-sync/infrastructure/DiskInterceptedDataRepository';

describe('DiskInterceptedDataRepositoryFactory', () => {
  const mockFs = {} as any;
  const mockPath = {} as any;
  const mockLogger = { withContext: vi.fn().mockReturnThis() } as any;

  it('should create a DiskInterceptedDataRepository', () => {
    const factory = new DiskInterceptedDataRepositoryFactory(mockFs, mockPath, mockLogger);
    const repo = factory.create('/mock/dir');

    expect(repo).toBeInstanceOf(DiskInterceptedDataRepository);
  });

  it('should create a DiskInterceptedDataRepository without baseDir', () => {
    const factory = new DiskInterceptedDataRepositoryFactory(mockFs, mockPath, mockLogger);
    const repo = factory.create();

    expect(repo).toBeInstanceOf(DiskInterceptedDataRepository);
  });
});
