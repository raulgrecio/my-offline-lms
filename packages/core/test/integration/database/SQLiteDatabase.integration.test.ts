import { describe, it, expect, vi } from "vitest";
import { SQLiteDatabase } from "@core/database";

// Para probar la clase real, debemos des-mockearla (saltándonos la protección global)
// Esto es seguro porque usaremos ":memory:" en el test.
vi.unmock("@core/database");

describe("SQLiteDatabase (Integration)", () => {
  it("should perform real database operations in memory", () => {
    // Usamos :memory: para que sea 100% seguro y volátil
    const db = new SQLiteDatabase(":memory:");

    // 1. Inicializar (crea el esquema base si lo hubiera)
    db.initialize();

    // 2. Operaciones reales
    db.exec("CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)");
    db.exec("INSERT INTO test (name) VALUES ('Antigravity')");

    const results = db.prepare("SELECT * FROM test").all() as any[];
    
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("Antigravity");

    // 3. Cerrar
    db.close();
  });

  it("should handle transactions correctly", () => {
    const db = new SQLiteDatabase(":memory:");
    db.exec("CREATE TABLE account (id INTEGER PRIMARY KEY, balance INTEGER)");

    db.transaction(() => {
      db.exec("INSERT INTO account (balance) VALUES (100)");
      db.exec("INSERT INTO account (balance) VALUES (200)");
    })();

    const results = db.prepare("SELECT SUM(balance) as total FROM account").get() as any;
    expect(results.total).toBe(300);

    db.close();
  });
});
