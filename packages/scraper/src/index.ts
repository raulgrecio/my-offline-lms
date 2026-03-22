import { db, initDb } from "./platform/database/schema";
import { runCLI } from "./cli";

async function main() {
    console.log("Inicializando servidor local...");
    await initDb();
    process.title = "my-offline-lms-scraper";
    console.log("Backend preparado. Todo listo para iniciar el scraping.");

    await runCLI(db);
}

main().catch(console.error);
