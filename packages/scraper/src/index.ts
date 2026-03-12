import { db, initDb } from "./db/schema";
import { runCLI } from "./presentation/cli";

console.log("Inicializando servidor local...");
initDb(db);
console.log("Backend preparado. Todo listo para iniciar el scraping.");

runCLI(db).catch(console.error);
