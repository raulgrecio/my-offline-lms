import { describe, it, expect, beforeAll } from 'vitest';
import { type IDatabase, SQLiteDatabase } from '@core/database';
import { NodeFileSystem } from '@core/filesystem';
import { ConsoleLogger } from '@core/logging';
import { getDb } from '@scraper/platform/database';
import { SQLiteAssetRepository } from '@scraper/features/asset-download';

describe('SQLiteAssetRepository', () => {
  let db: IDatabase;
  let repository: SQLiteAssetRepository;

  beforeAll(async () => {
    const logger = new ConsoleLogger();

    // Inyectamos base de datos en memoria para los tests unitarios
    const memoryDb = new SQLiteDatabase(':memory:');

    db = await getDb({
      database: memoryDb,
      fsAdapter: new NodeFileSystem(logger)
    });
    repository = new SQLiteAssetRepository(db);

    db.prepare('DELETE FROM Course_Assets').run();
    db.prepare('DELETE FROM LearningPath_Courses').run();
    db.prepare('DELETE FROM Courses').run();

    // Insert dummy course to satisfy foreign key
    db.prepare('INSERT INTO Courses (id, title, slug) VALUES (?, ?, ?)').run('c1', 'Test Course', 'test-course');
  });

  it('should save and get an asset', () => {
    const asset = {
      id: 'a1',
      courseId: 'c1',
      type: 'video' as any,
      url: 'http://v1',
      metadata: { name: 'Video 1' },
      status: 'PENDING' as any
    };

    repository.saveAsset(asset);
    const found = repository.getAssetById('a1');

    expect(found).not.toBeNull();
    expect(found?.id).toBe('a1');
    expect(found?.metadata.name).toBe('Video 1');
  });

  it('should handle pending assets with null metadata or default values', () => {
    // Manually insert a row with null metadata if possible, or just use saveAsset with empty meta
    const asset = {
      id: 'a2',
      courseId: 'c1',
      type: 'guide' as any,
      url: 'http://g1',
      metadata: null as any, // This should trigger line 69 coverage if mapped back
      status: 'PENDING' as any
    };

    repository.saveAsset(asset);

    // Line 69 coverage test: getPendingAssets or getAssetById
    const pending = repository.getPendingAssets('c1', 'guide');
    const target = pending.find(p => p.id === 'a2');

    expect(target).toBeDefined();
    expect(target?.metadata).toEqual({});
  });

  it('should update asset status and completion', () => {
    repository.updateAssetStatus('a1', 'DOWNLOADING');
    expect(repository.getAssetById('a1')?.status).toBe('DOWNLOADING');

    repository.updateAssetCompletion('a1', { name: 'V1', filename: 'v1.mp4' }, '/path/v1.mp4');
    const completed = repository.getAssetById('a1');
    expect(completed?.status).toBe('COMPLETED');
    expect(completed?.localPath).toBe('/path/v1.mp4');
  });

  it('should count assets', () => {
    const count = repository.countAssetsByCourseId('c1');
    expect(count).toBeGreaterThan(0);
  });
});
