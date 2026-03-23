import { db, initDb } from "./platform/database/schema";
import { runCLI } from "./cli";
import { logger } from "./platform/logging";

async function main() {
    logger.info("Inicializando servidor local...");
    await initDb();
    process.title = "my-offline-lms-scraper";
    logger.info("Backend preparado. Todo listo para iniciar el scraping.");

    await runCLI(db);
}

main().catch(err => logger.error("Error en el proceso principal", err));
