import Database from "better-sqlite3";
import path from "path";

const dbPath = path.resolve(__dirname, "../../../data/db.sqlite");
const db = new Database(dbPath, { verbose: console.log });

console.log("Iniciando migración para eliminar UNIQUE constraint en Courses.slug...");

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
        
        console.log("✅ Migración completada con éxito.");
    })();

    // 5. Re-habilitar FKs
    db.exec('PRAGMA foreign_keys = ON');
} catch (error) {
    console.error("❌ Error durante la migración:", error);
    process.exit(1);
}
