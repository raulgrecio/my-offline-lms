import { describe, it, expect, beforeEach } from 'vitest';
import { SQLiteAssetRepository } from '@scraper/features/asset-download/infrastructure/AssetRepository';
import { SQLiteDatabase } from '@core/database';
import { type AssetStatus } from '@core/domain';

describe('SQLiteAssetRepository', () => {
  let db: SQLiteDatabase;
  let repo: SQLiteAssetRepository;

  beforeEach(() => {
    db = new SQLiteDatabase(':memory:');
    db.initialize();
    repo = new SQLiteAssetRepository(db);

    // Insert parent course to satisfy FK
    db.prepare("INSERT INTO Courses (id, title) VALUES ('c1', 'Course 1')").run();
  });

  it('should save and retrieve an asset', () => {
    const asset = {
      id: 'a1',
      courseId: 'c1',
      type: 'video' as any,
      url: 'http://url',
      metadata: { name: 'Test', duration: 100 },
      status: 'PENDING' as AssetStatus,
      localPath: '/path'
    };

    repo.saveAsset(asset);
    const retrieved = repo.getAssetById('a1');

    expect(retrieved).toMatchObject(asset);
    expect(retrieved?.metadata).toEqual({ name: 'Test', duration: 100 });
  });

  it('should update asset status', () => {
    repo.saveAsset({ id: 'a1', courseId: 'c1', type: 'video' as any, url: 'http://', status: 'PENDING', metadata: { name: 'V1', duration: 10 } });
    repo.updateAssetStatus('a1', 'DOWNLOADING');
    expect(repo.getAssetById('a1')?.status).toBe('DOWNLOADING');
  });

  it('should update asset completion', () => {
    repo.saveAsset({ id: 'a1', courseId: 'c1', type: 'video' as any, url: 'http://', status: 'PENDING', metadata: { name: 'V1', duration: 10 } });
    repo.updateAssetCompletion('a1', { name: 'V1', duration: 100 }, '/completed/path');

    const asset = repo.getAssetById('a1');
    expect(asset?.status).toBe('COMPLETED');
    expect(asset?.metadata).toEqual({ name: 'V1', duration: 100 });
    expect(asset?.localPath).toBe('/completed/path');
  });

  it('should count assets', () => {
    repo.saveAsset({ id: 'a1', courseId: 'c1', type: 'video' as any, url: 'u1', status: 'PENDING', metadata: { name: 'V1', duration: 10 } });
    repo.saveAsset({ id: 'a2', courseId: 'c1', type: 'video' as any, url: 'u2', status: 'PENDING', metadata: { name: 'V2', duration: 10 } });
    expect(repo.countAssetsByCourseId('c1')).toBe(2);
  });

  it('should get pending assets', () => {
    repo.saveAsset({ id: 'a1', courseId: 'c1', type: 'video' as any, url: 'u1', status: 'COMPLETED', metadata: { name: 'V1', duration: 10 } });
    repo.saveAsset({ id: 'a2', courseId: 'c1', type: 'video' as any, url: 'u2', status: 'PENDING', metadata: { name: 'V2', duration: 10 } });

    const pending = repo.getPendingAssets('c1', 'video' as any);
    expect(pending).toHaveLength(1);
    expect(pending[0].id).toBe('a2');
  });

  it('should throw if saving invalid asset type', () => {
    expect(() => repo.saveAsset({ id: 'a1', courseId: 'c1', type: 'invalid' as any, url: 'u1', status: 'PENDING', metadata: { name: 'V1', duration: 10 } }))
      .toThrow();
  });

  it('should handle missing metadata in saveAsset and getAssetById', () => {
    repo.saveAsset({
      id: "a_no_meta", courseId: "c1", type: "guide" as any, url: "u", status: "PENDING", metadata: undefined as any
    });
    const retrieved = repo.getAssetById("a_no_meta");
    expect(retrieved?.metadata).toEqual({});
  });

  it('should handle missing localPath in updateAssetCompletion', () => {
    repo.saveAsset({ id: 'a1', courseId: 'c1', type: 'video' as any, url: 'http://', status: 'PENDING', metadata: { name: 'V1' } });
    repo.updateAssetCompletion('a1', { name: "V1" } as any); // no localPath
    expect(repo.getAssetById('a1')?.localPath).toBeNull();
  });

  it('should return null if asset not found', () => {
    expect(repo.getAssetById('unknown')).toBeNull();
  });

  it('should handle NULL metadata in DB', () => {
    db.prepare("INSERT INTO Course_Assets (id, course_id, type, url, metadata, status) VALUES ('null_meta', 'c1', 'video', 'u', NULL, 'PENDING')").run();
    const retrieved = repo.getAssetById('null_meta');
    expect(retrieved?.metadata).toEqual({});
  });
});
