import { NodeFileSystem } from "@my-offline-lms/core/filesystem";
import { ConsoleLogger } from "@my-offline-lms/core/logging";
import { getDb } from "@platform/database/database";
import { runCLI } from "./cli";

async function main() {
  const logger = new ConsoleLogger("Main");
  const fs = new NodeFileSystem(logger);

  try {
    logger.info("Inicializando servidor local...");
    const database = await getDb({ fsAdapter: fs });
    process.title = "my-offline-lms-scraper";
    logger.info("Backend preparado. Todo listo para iniciar el scraping.");

    await runCLI(database);
  } catch (err: any) {
    logger.error("Error en el proceso principal", err);
    process.exit(1);
  }
}

main();
