import { describe, it, expect, vi, beforeEach } from "vitest";

import { SQLiteDatabase } from '@my-offline-lms/core/database';
import { NodeFileSystem } from '@my-offline-lms/core/filesystem';

// Mocks
vi.mock("@my-offline-lms/core/database", async (importOriginal) => {
  const actual = await importOriginal<any>();
  const mockDb = {
    exec: vi.fn(),
    initialize: vi.fn(),
  };
  return {
    ...actual,
    SQLiteDatabase: vi.fn().mockImplementation(function () {
      return mockDb;
    }),
  };
});

vi.mock("@config/paths", () => ({
  getDbPath: vi.fn(),
}));

vi.mock("@my-offline-lms/core/filesystem", async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    NodeFileSystem: vi.fn().mockImplementation(function () {
      return {
        exists: vi.fn().mockResolvedValue(false),
        mkdir: vi.fn().mockResolvedValue(undefined),
      };
    }),
    NodePath: vi.fn().mockImplementation(function () {
      // Simulamos comportamiento de dirname cross-platform para el test
      return {
        dirname: vi.fn((p: string) => {
          const parts = p.split(/[\\\/]/);
          parts.pop();
          return parts.join(p.includes('\\') ? '\\' : '/');
        }),
      };
    }),
  };
});

vi.mock("@platform/db/schema", () => ({
  runMigrations: vi.fn(),
}));

describe("Database Windows Compatibility", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("should correctly handle Windows paths and create directory", async () => {
    // Importamos después de resetModules
    const { getDb } = await import("@platform/db/database");
    const { getDbPath: mockedGetDbPath } = await import("@config/paths");

    // Devolvemos una ruta tipo Windows
    vi.mocked(mockedGetDbPath).mockResolvedValue("C:\\Users\\Raul\\data\\db.sqlite");

    const db = await getDb();

    // Verificamos que se llamó a mkdir con el directorio (sin el archivo)
    // El mock de NodeFileSystem se inyectó en getDb
    // Necesitamos acceder a la instancia interna de NodeFileSystem que creó getDb
    const fsInstance = vi.mocked(NodeFileSystem).mock.results[0].value;

    expect(fsInstance.mkdir).toHaveBeenCalledWith("C:\\Users\\Raul\\data", { recursive: true });
    expect(SQLiteDatabase).toHaveBeenCalledWith("C:\\Users\\Raul\\data\\db.sqlite", expect.any(Object));
  });

  it("should correctly handle Linux paths and create directory", async () => {
    const { getDb } = await import("@platform/db/database");
    const { getDbPath: mockedGetDbPath } = await import("@config/paths");

    vi.mocked(mockedGetDbPath).mockResolvedValue("/home/raul/data/db.sqlite");

    const db = await getDb();

    const fsInstance = vi.mocked(NodeFileSystem).mock.results[0].value;
    expect(fsInstance.mkdir).toHaveBeenCalledWith("/home/raul/data", { recursive: true });
  });
});
