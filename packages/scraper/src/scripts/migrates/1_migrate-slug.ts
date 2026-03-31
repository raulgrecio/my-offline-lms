import { getDb } from "@scraper/platform/database/database";
import { logger } from "@scraper/platform/logging";

async function main() {
  logger.info("Iniciando migración para eliminar UNIQUE constraint en Courses.slug...");

  const db = await getDb();

  try {
    // 1. Deshabilitar FKs temporalmente para poder borrar la tabla
    db.exec('PRAGMA foreign_keys = OFF');

    db.transaction(() => {
      // 2. Crear tabla temporal sin el UNIQUE
      db.prepare(`
                CREATE TABLE IF NOT EXISTS Courses_new (
                    id TEXT PRIMARY KEY,
                    slug TEXT,
                    title TEXT
                );
            `).run();

      // 3. Copiar datos
      db.prepare(`INSERT INTO Courses_new SELECT id, slug, title FROM Courses;`).run();

      // 4. Eliminar tabla vieja y renombrar
      db.prepare(`DROP TABLE Courses;`).run();
      db.prepare(`ALTER TABLE Courses_new RENAME TO Courses;`).run();

      logger.info("✅ Migración completada con éxito.");
    })();

    // 5. Re-habilitar FKs
    db.exec('PRAGMA foreign_keys = ON');
  } catch (error) {
    logger.error("❌ Error durante la migración:", error);
    process.exit(1);
  }
}

main();
