import { describe, it, expect, vi } from 'vitest';

// Mock the core filesystem to control PathResolver behavior
vi.mock('@core/filesystem', () => {
  return {
    NodeFileSystem: vi.fn().mockImplementation(function () {
      return {};
    }),
    NodePath: vi.fn().mockImplementation(function () {
      return {
        join: (...args: string[]) => args.join('/').replace(/\/+/g, '/')
      };
    }),
    PathResolver: vi.fn().mockImplementation(function () {
      return {
        getMonorepoRoot: vi.fn().mockResolvedValue('/mock/monorepo'),
        getScraperRoot: vi.fn().mockResolvedValue('/mock/monorepo/packages/scraper'),
        getAssetConfigPath: vi.fn().mockResolvedValue('/mock/monorepo/config/assets.json'),
        getDbPath: vi.fn().mockResolvedValue('/mock/monorepo/data/db.sqlite'),
        getDataRoot: vi.fn().mockResolvedValue('/mock/monorepo/data'),
      };
    })
  };
});

import {
  getMonorepoRoot,
  getScraperRoot,
  getDataDir,
  getAuthDir,
  getAuthState,
  getInterceptedDir,
  getAssetPathsConfig,
  getDbPath,
  getAssetsDir
} from '@scraper/config/paths';

describe('config/paths', () => {
  it('should return correct monorepo root', async () => {
    expect(await getMonorepoRoot()).toBe('/mock/monorepo');
  });

  it('should return correct scraper root', async () => {
    expect(await getScraperRoot()).toBe('/mock/monorepo/packages/scraper');
  });

  it('should return correct data dir', async () => {
    expect(await getDataDir()).toBe('/mock/monorepo/packages/scraper/data');
  });

  it('should return correct auth dir', async () => {
    expect(await getAuthDir()).toBe('/mock/monorepo/packages/scraper/data/.auth');
  });

  it('should return correct auth state path', async () => {
    expect(await getAuthState()).toBe('/mock/monorepo/packages/scraper/data/.auth/state.json');
  });

  it('should return correct intercepted dir', async () => {
    expect(await getInterceptedDir()).toBe('/mock/monorepo/packages/scraper/data/intercepted');
  });

  it('should return correct asset paths config', async () => {
    expect(await getAssetPathsConfig()).toBe('/mock/monorepo/config/assets.json');
  });

  it('should return correct db path', async () => {
    expect(await getDbPath()).toBe('/mock/monorepo/data/db.sqlite');
  });

  it('should return correct assets dir', async () => {
    expect(await getAssetsDir()).toBe('/mock/monorepo/data/assets');
  });

  it('should return correct logs dir and file', async () => {
    const { getLogsDir, getLogsFile } = await import('@scraper/config/paths');
    expect(await getLogsDir()).toBe('/mock/monorepo/logs');
    expect(await getLogsFile()).toBe('/mock/monorepo/logs/scraper.log');
  });
});
