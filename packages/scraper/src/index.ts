import { initDb } from "./db/schema";

console.log("Inicializando servidor local...");
initDb();
console.log("Backend preparado. Todo listo para iniciar el scraping.");
