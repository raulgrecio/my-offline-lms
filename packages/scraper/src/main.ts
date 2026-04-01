import { runCLI } from "./cli";

async function main() {
  await runCLI();
}

main().catch((error) => {
  console.error("Error running CLI:", error);
  process.exit(1);
});
