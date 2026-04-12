import { discoverRoutes } from "./config/routes";
import { captureScreenshots } from "./capture/captureRoutes";
import { compareImages } from "./compare/compareImages";
import { logger } from "./logger";

const mode = process.argv[2];
const filters = process.argv.slice(3).filter(arg => !arg.startsWith("--"));
const force = process.argv.includes("--force");

if (!mode || (mode !== "baseline" && mode !== "current")) {
  logger.error("Usage: tsx run.ts [baseline|current] [filters...] [--force]");
  process.exit(1);
}

async function main() {
  logger.info(`Starting visual test pipeline in ${mode} mode...`);

  const routes = await discoverRoutes(filters);
  logger.info(`Discovered ${routes.length} routes: ${routes.join(", ")}`);

  if (mode === "baseline") {
    await captureScreenshots(routes, "baseline", force);
    logger.info("Baseline captured successfully.");
  }

  if (mode === "current") {
    await captureScreenshots(routes, "current", force);
    logger.info("Current snapshots captured. Comparing with baseline...");
    await compareImages(routes);
    logger.info("Comparison complete. Check reports/report.json");
  }
}

main().catch((err) => {
  logger.error("Visual test pipeline failed:", err);
  process.exit(1);
});
