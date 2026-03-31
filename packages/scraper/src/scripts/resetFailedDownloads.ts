import { getDb } from "@scraper/platform/database/database";
import { verifyAssetFiles } from "./helpers/verifyAssetFiles";
import { logger as baseLogger } from "@scraper/platform/logging";
import { type IDatabase } from "@core/database";

const logger = baseLogger.withContext("resetFailedDownloads");

async function resetCourse(db: IDatabase, courseId: string) {
  logger.info(`\n🔍 Checking missing assets for Course ID: ${courseId} to reset...`);

  const assets = db.prepare("SELECT id, type, status, metadata FROM Course_Assets WHERE course_id = ?").all(courseId) as any[];

  if (assets.length === 0) {
    return;
  }

  let resetCount = 0;

  for (const asset of assets) {
    const { videoExists, vttExists, guideExists, safeName } = await verifyAssetFiles({
      type: asset.type,
      courseId,
      metadataStr: asset.metadata
    });

    let needsReset = false;
    let reason = "";

    if (asset.type === 'video') {
      if (!videoExists || !vttExists) {
        needsReset = true;
        reason = !videoExists ? "Missing .mp4" : "Missing .vtt";
      }
    } else if (asset.type === 'guide') {
      if (!guideExists) {
        needsReset = true;
        reason = "Missing .pdf";
      }
    }

    // We want to reset it if it needs resetting AND is not already PENDING
    if (needsReset && asset.status !== 'PENDING') {
      db.prepare("UPDATE Course_Assets SET status = 'PENDING' WHERE id = ?").run(asset.id);

      logger.info(`   🔄 Resetting [${asset.type.toUpperCase()}] ${safeName} to PENDING (${reason})`);
      resetCount++;
    }
  }

  if (resetCount > 0) {
    logger.info(`   ✅ Reset ${resetCount} assets to PENDING status for Course ${courseId}.`);
  } else {
    logger.info(`   No assets needed resetting in Course ${courseId}.`);
  }
}

async function resetPath(db: IDatabase, pathId: string) {
  logger.info(`\n===================================================`);
  logger.info(`🚀 Resetting missing assets in Learning Path ID: ${pathId}`);
  logger.info(`===================================================`);

  const courses = db.prepare("SELECT course_id FROM LearningPath_Courses WHERE path_id = ? ORDER BY order_index ASC").all(pathId) as { course_id: string }[];

  for (const course of courses) {
    await resetCourse(db, course.course_id);
  }
}

// CLI Integration
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    logger.info("Usage:");
    logger.info("  pnpm exec ts-node src/scripts/resetFailedDownloads.ts course <courseId>");
    logger.info("  pnpm exec ts-node src/scripts/resetFailedDownloads.ts path <pathId>");
    process.exit(1);
  }

  const type = args[0];
  const targetId = args[1];

  (async () => {
    const db = await getDb();
    if (type === "course") {
      await resetCourse(db, targetId);
    } else if (type === "path") {
      await resetPath(db, targetId);
    } else {
      logger.info("Unknown command. Use 'course' or 'path'.");
    }
  })().catch(err => {
    logger.error("Fatal error:", err);
    process.exit(1);
  });
}
