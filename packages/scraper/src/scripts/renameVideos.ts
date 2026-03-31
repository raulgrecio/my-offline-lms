import { getDb } from "@scraper/platform/database";
import { AssetNamingService } from "@scraper/features/asset-download";
import { getAssetsDir } from "@scraper/config";
import { logger as baseLogger } from "@scraper/platform/logging";
import { NodeFileSystem, NodePath } from "@core/filesystem";

const logger = baseLogger.withContext("renameVideos");

async function renameVideosForCourse(courseId: string) {
  const fs = new NodeFileSystem(logger);
  const path = new NodePath();
  const assetsDir = await getAssetsDir();
  const courseVideosDir = path.join(assetsDir, courseId, "videos");

  if (!(await fs.exists(courseVideosDir))) {
    logger.error(`No folder found at ${courseVideosDir}`);
    return;
  }

  const db = await getDb();
  const rows = db.prepare("SELECT id, metadata FROM Course_Assets WHERE course_id = ? AND type = 'video' AND status = 'COMPLETED'").all(courseId) as any[];

  logger.info(`Checking ${rows.length} completed videos for renaming...`);

  let renamedCount = 0;

  for (const row of rows) {
    const meta = JSON.parse(row.metadata || "{}");

    const namingService = new AssetNamingService();
    let rawName = namingService.generateSafeFilename(meta.name) || row.id;

    if (!meta.order_index) {
      continue; // Nothing to prefix
    }

    const prefixedName = namingService.generateSafeFilename(meta.name, meta.order_index);

    // Check all files in the directory that start with rawName
    const allFiles = await fs.readdir(courseVideosDir);
    let renamedSomething = false;

    for (const file of allFiles) {
      // A match is something like "Overview.mp4" or "Overview.es.vtt"
      if (file.startsWith(rawName) && !file.startsWith(prefixedName)) {
        // The part after rawName (e.g. ".mp4", ".es.vtt")
        const suffix = file.substring(rawName.length);

        const oldPath = path.join(courseVideosDir, file);
        const newPath = path.join(courseVideosDir, `${prefixedName}${suffix}`);

        await fs.rename(oldPath, newPath);
        logger.info(`Renamed: ${file} -> ${prefixedName}${suffix}`);
        renamedSomething = true;
      }
    }

    if (renamedSomething) {
      renamedCount++;
    }
  }

  logger.info(`All done! Renamed ${renamedCount} videos.`);
}

async function main() {
  const args = process.argv.slice(2);
  const targetCourse = args[0] || "86212";
  try {
    await renameVideosForCourse(targetCourse);
  } catch (err) {
    logger.error('renameVideosForCourse error:', err);
    process.exit(1);
  }
}

main();
