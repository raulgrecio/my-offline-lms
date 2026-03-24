import { initDb } from "@db/schema";
import { logger } from "@platform/logging";

async function main() {
  logger.info("Iniciando migración de metadatos: title -> name en Course_Assets...");

  const db = await initDb();

  try {
    const assets = db.prepare("SELECT id, metadata FROM Course_Assets").all() as { id: string, metadata: string }[];

    let updatedCount = 0;

    db.transaction(() => {
      for (const asset of assets) {
        try {
          const metadata = JSON.parse(asset.metadata);
          let changed = false;

          if (metadata.title !== undefined) {
            // Si ya existe 'name', lo respetamos o lo sobrescribimos con 'title'?
            // El usuario dice "convertir todos los key de meta.title actuales a meta.name"
            // Así que 'title' manda.
            metadata.name = metadata.title;
            delete metadata.title;
            changed = true;
          }

          if (changed) {
            db.prepare("UPDATE Course_Assets SET metadata = ? WHERE id = ?")
              .run(JSON.stringify(metadata), asset.id);
            updatedCount++;
          }
        } catch (e) {
          logger.error(`Error procesando asset ${asset.id}:`, e);
        }
      }
    })();

    logger.info(`✅ Migración completada. Se actualizaron ${updatedCount} registros.`);
  } catch (error) {
    logger.error("❌ Error durante la migración:", error);
    process.exit(1);
  }
}

main();
