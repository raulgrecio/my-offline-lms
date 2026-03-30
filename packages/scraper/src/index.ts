import { runCLI } from "./cli";
export { runCLI };
export { ScraperService } from "./ScraperService";

async function main() {
  await runCLI();
}

main();
