import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { logger } from "@platform/logging";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ajustar rutas según ejecución desde src/scripts/ (3 niveles abajo de la raíz)
const DB_PATH = path.resolve(__dirname, '../../../../data/db.sqlite');

const TARGET_LP_ID = '80836';

async function run() {
  logger.info(`Starting cleanup. Target LP: ${TARGET_LP_ID}`);
  logger.info(`Database path: ${DB_PATH}`);
  
  if (!fs.existsSync(DB_PATH)) {
    logger.error(`Database not found!`);
    process.exit(1);
  }

  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  try {
    // 1. Obtener los IDs de los cursos que pertenecen al LP que queremos conservar
    const coursesToKeep = db.prepare('SELECT course_id FROM LearningPath_Courses WHERE path_id = ?')
      .all(TARGET_LP_ID)
      .map(row => row.course_id);
    
    logger.info(`Courses to keep (${coursesToKeep.length}):`, JSON.stringify(coursesToKeep));

    // 2. Identificar archivos físicos de assets que vamos a borrar
    // Borramos assets que NO pertenecen a los cursos que queremos conservar
    const assetsToDelete = db.prepare(`
      SELECT local_path FROM Course_Assets 
      WHERE course_id NOT IN (${coursesToKeep.map(() => '?').join(',')})
      AND local_path IS NOT NULL
    `).all(...coursesToKeep);

    logger.info(`Identified ${assetsToDelete.length} files to delete.`);

    // Borrar archivos físicos
    let deletedFiles = 0;
    for (const asset of assetsToDelete) {
      if (!asset.local_path) continue;
      
      const fullPath = path.isAbsolute(asset.local_path) 
        ? asset.local_path 
        : path.resolve(__dirname, '../../../../', asset.local_path);
      
      if (fs.existsSync(fullPath)) {
        try {
          fs.unlinkSync(fullPath);
          deletedFiles++;
        } catch (err) {
          logger.error(`Failed to delete file: ${fullPath}`, err.message);
        }
      }
    }
    logger.info(`Successfully deleted ${deletedFiles} physical files.`);

    // 3. Limpieza de base de datos en orden de dependencias
    db.transaction(() => {
      logger.info('Clearing user tables...');
      db.prepare('DELETE FROM UserProgress').run();
      db.prepare('DELETE FROM UserCourseProgress').run();
      db.prepare('DELETE FROM UserSettings').run();

      logger.info('Pruning non-target content...');
      // Borrar assets de otros cursos
      db.prepare(`
        DELETE FROM Course_Assets 
        WHERE course_id NOT IN (${coursesToKeep.map(() => '?').join(',')})
      `).run(...coursesToKeep);

      // Borrar relaciones de otros LPs
      db.prepare('DELETE FROM LearningPath_Courses WHERE path_id != ?').run(TARGET_LP_ID);

      // Borrar otros cursos
      db.prepare(`
        DELETE FROM Courses 
        WHERE id NOT IN (${coursesToKeep.map(() => '?').join(',')})
      `).run(...coursesToKeep);

      // Borrar otros LPs
      db.prepare('DELETE FROM LearningPaths WHERE id != ?').run(TARGET_LP_ID);

      logger.info('Database records cleaned successfully.');
    })();

    // 4. Vaciar la DB para reducir tamaño
    db.exec('VACUUM;');
    logger.info('Database vacuumed.');

  } catch (error) {
    logger.error('Cleanup failed:', error);
  } finally {
    db.close();
    logger.info('Cleanup finished.');
  }
}

run();

