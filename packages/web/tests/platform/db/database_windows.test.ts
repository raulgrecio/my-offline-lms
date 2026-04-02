import { describe, it, expect, vi, beforeEach } from "vitest";

vi.unmock("@web/platform/db/database");
vi.unmock("@core/database");

import { SQLiteDatabase } from '@core/database';
import { NodeFileSystem } from '@core/filesystem';

// Mocks
vi.mock("@core/database", async (importOriginal) => {
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

vi.mock("@web/config/paths", () => ({
  getDbPath: vi.fn(),
}));

vi.mock("@core/filesystem", async (importOriginal) => {
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

vi.mock("@web/platform/db/schema", () => ({
  runMigrations: vi.fn(),
}));

describe("Database Windows Compatibility", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("should correctly handle Windows paths and create directory", async () => {
    // Importamos después de resetModules
    const { getDb } = await import("@web/platform/db");
    const { getDbPath: mockedGetDbPath } = await import("@web/config");

    // Devolvemos una ruta tipo Windows
    const winPath = "C:\\Users\\Raul\\data\\db.sqlite";
    vi.mocked(mockedGetDbPath).mockResolvedValue(winPath);

    const db = await getDb();

    // Verificamos que se llamó a mkdir con el directorio (sin el archivo)
    // El mock de NodeFileSystem se inyectó en getDb
    // Necesitamos acceder a la instancia interna de NodeFileSystem que creó getDb
    const fsInstance = vi.mocked(NodeFileSystem).mock.results[0].value;

    expect(fsInstance.mkdir).toHaveBeenCalledWith("C:\\Users\\Raul\\data", { recursive: true });
    expect(SQLiteDatabase).toHaveBeenCalledWith(winPath, expect.any(Object));
  });

  it("should correctly handle Linux paths and create directory", async () => {
    const { getDb } = await import("@web/platform/db");
    const { getDbPath: mockedGetDbPath } = await import("@web/config");

    const linPath = "/home/raul/data/db.sqlite";
    vi.mocked(mockedGetDbPath).mockResolvedValue(linPath);

    const db = await getDb();

    const fsInstance = vi.mocked(NodeFileSystem).mock.results[0].value;
    expect(fsInstance.mkdir).toHaveBeenCalledWith("/home/raul/data", { recursive: true });
  });
});
