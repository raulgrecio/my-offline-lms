import { db, initDb } from "./platform/database/schema";
import { runCLI } from "./cli";

console.log("Inicializando servidor local...");
(async () => {
    await initDb(db);
    process.title = "my-offline-lms-scraper";
})();
console.log("Backend preparado. Todo listo para iniciar el scraping.");

runCLI(db).catch(console.error);
