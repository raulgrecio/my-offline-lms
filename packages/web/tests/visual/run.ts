import { discoverRoutes } from "./config/routes";
import { captureScreenshots } from "./capture/captureRoutes";
import { compareImages } from "./compare/compareImages";

const mode = process.argv[2];
const force = process.argv.includes("--force");

if (!mode || (mode !== "baseline" && mode !== "current")) {
  console.error("Usage: tsx run.ts [baseline|current] [--force]");
  process.exit(1);
}

async function main() {
  console.log(`Starting visual test pipeline in ${mode} mode...`);

  const routes = await discoverRoutes();
  console.log(`Discovered ${routes.length} routes: ${routes.join(", ")}`);

  if (mode === "baseline") {
    await captureScreenshots(routes, "baseline", force);
    console.log("Baseline captured successfully.");
  }

  if (mode === "current") {
    await captureScreenshots(routes, "current", force);
    console.log("Current snapshots captured. Comparing with baseline...");
    await compareImages();
    console.log("Comparison complete. Check reports/report.json");
  }
}

main().catch((err) => {
  console.error("Visual test pipeline failed:", err);
  process.exit(1);
});
