import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { NodeFileSystem, NodePath } from "@my-offline-lms/core/filesystem";

const fs = new NodeFileSystem();
const path = new NodePath();

export async function compareImages() {
  const baselineDir = "debug/baseline/pages";
  const currentDir = "debug/current/pages";
  const diffDir = "debug/diff/pages";
  const reportDir = "debug/reports";

  if (!(await fs.exists(diffDir))) {
    await fs.mkdir(diffDir, { recursive: true });
  }
  if (!(await fs.exists(reportDir))) {
    await fs.mkdir(reportDir, { recursive: true });
  }

  const files = await fs.readdir(baselineDir);
  const report = [];

  for (const file of files) {
    if (!file.endsWith(".png")) continue;

    const baselinePath = path.join(baselineDir, file);
    const currentPath = path.join(currentDir, file);

    if (!(await fs.exists(currentPath))) {
      console.warn(`current snapshot missing for ${file}`);
      continue;
    }

    try {
      const baselineBuffer = await fs.readFile(baselinePath);
      const currentBuffer = await fs.readFile(currentPath);

      const baseline = PNG.sync.read(baselineBuffer);
      const current = PNG.sync.read(currentBuffer);

      // Handle dimension mismatch
      if (baseline.width !== current.width || baseline.height !== current.height) {
        console.error(`Dimension mismatch for ${file}. Baseline: ${baseline.width}x${baseline.height}, Current: ${current.width}x${current.height}`);
        report.push({
          file,
          error: "dimension-mismatch",
          baselineWidth: baseline.width,
          baselineHeight: baseline.height,
          currentWidth: current.width,
          currentHeight: current.height,
        });
        continue;
      }

      const diff = new PNG({
        width: baseline.width,
        height: baseline.height,
      });

      const diffPixels = pixelmatch(
        baseline.data,
        current.data,
        diff.data,
        baseline.width,
        baseline.height,
        {
          threshold: 0.1,
        }
      );

      const diffPath = path.join(diffDir, file);
      await fs.writeFile(diffPath, PNG.sync.write(diff));

      report.push({
        file,
        diffPixels,
        percentage: ((diffPixels / (baseline.width * baseline.height)) * 100).toFixed(2) + "%",
      });

      console.log(`compared ${file}: ${diffPixels} pixels different`);
    } catch (err) {
      console.error(`failed to compare ${file}:`, err);
    }
  }

  await fs.writeFile(
    path.join(reportDir, "report.json"),
    JSON.stringify(report, null, 2)
  );
}
