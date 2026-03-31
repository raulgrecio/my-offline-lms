import path from "path";
import { getDb } from "@scraper/platform/database/database";
import { verifyAssetFiles } from "./helpers/verifyAssetFiles";
import { getAssetsDir } from "@scraper/config/paths";
import { SQLiteAssetRepository } from "@scraper/features/asset-download/infrastructure/AssetRepository";
import { logger as baseLogger } from "@scraper/platform/logging";
import { type IDatabase } from "@core/database";

const logger = baseLogger.withContext("verifyDownloads");

/**
 * Verifies all downloaded videos for a specific course.
 */
export async function verifyCourseDownloads({ db, courseId, repair }: { db: IDatabase, courseId: string, repair?: boolean }) {
  logger.info(`\n🔍 Verifying downloads for Course ID: ${courseId}${repair ? ' [MODE: REPAIR]' : ''}`);

  const assetRepository = new SQLiteAssetRepository(db);
  const assetsDir = await getAssetsDir();

  const courseRows = db.prepare("SELECT title FROM Courses WHERE id = ?").get(courseId) as { title: string } | undefined;
  if (courseRows) {
    logger.info(`   Course Title: ${courseRows.title}`);
  } else {
    logger.info(`   (Course not found in database)`);
  }

  // Get ALL assets for the course (videos and guides)
  const assets = db.prepare("SELECT id, type, status, metadata, local_path FROM Course_Assets WHERE course_id = ? ORDER BY type, json_extract(metadata, '$.order_index') ASC").all(courseId) as any[];

  if (assets.length === 0) {
    logger.info(`   No assets found for this course.`);
    return;
  }

  let missingFiles = 0;
  let healedCount = 0;
  let totalVideos = 0;
  let totalGuides = 0;

  for (const asset of assets) {
    if (asset.type === 'video') totalVideos++;
    if (asset.type === 'guide') totalGuides++;

    const { videoExists, vttExists, guideExists, actualPath, safeName } = await verifyAssetFiles({
      type: asset.type,
      courseId,
      metadataStr: asset.metadata,
      localPath: asset.local_path
    });

    let found = (asset.type === 'video' && videoExists) || (asset.type === 'guide' && guideExists);
    let statusSymbol = "✅";
    let issues = [];
    let locationNote = "";

    if (actualPath && !actualPath.includes(assetsDir)) {
      locationNote = ` [Ubicación: ${path.dirname(actualPath)}]`;
    }

    if (asset.status !== 'COMPLETED') {
      if (found && repair) {
        // HEAL: Update database using repository
        assetRepository.updateAssetCompletion(asset.id, JSON.parse(asset.metadata), actualPath);

        statusSymbol = "🩹";
        issues.push("HEALED (Marked as COMPLETED)");
        healedCount++;
      } else {
        statusSymbol = "⏳";
        issues.push(`DB Status: ${asset.status}`);
      }
    }

    if (!found) {
      statusSymbol = "❌";
      issues.push(`Missing ${asset.type === 'video' ? '.mp4' : '.pdf'}`);
      missingFiles++;
    } else if (asset.type === 'video' && !vttExists) {
      statusSymbol = "⚠️";
      issues.push("Missing .vtt (Subtitles)");
    }

    if (issues.length > 0) {
      logger.info(`   ${statusSymbol} [${asset.type.toUpperCase()}] ${safeName}${locationNote}  -> [${issues.join(", ")}]`);
    } else if (locationNote) {
      logger.info(`   ${statusSymbol} [${asset.type.toUpperCase()}] ${safeName}${locationNote}`);
    }
  }

  logger.info(`\n📊 Summary for Course ${courseId}:`);
  logger.info(`   Total Assets: ${assets.length} (${totalVideos} vids, ${totalGuides} guides)`);
  logger.info(`   Found on disk: ${assets.length - missingFiles}`);
  logger.info(`   Missing on disk: ${missingFiles}`);
  if (healedCount > 0) logger.info(`   ✨ Healed in DB: ${healedCount}`);

  logger.info("---------------------------------------------------");
}

/**
 * Verifies all downloaded videos for all courses within a learning path.
 */
export async function verifyPathDownloads({ db, pathId, repair = false }: { db: IDatabase, pathId: string, repair?: boolean }) {
  logger.info(`\n===================================================`);
  logger.info(`🚀 Verifying Learning Path ID: ${pathId}${repair ? ' [MODE: REPAIR]' : ''}`);
  logger.info(`===================================================`);

  const pathRows = db.prepare("SELECT title FROM LearningPaths WHERE id = ?").get(pathId) as { title: string } | undefined;
  if (pathRows) {
    logger.info(`Path Title: ${pathRows.title}`);
  }

  const courses = db.prepare("SELECT course_id FROM LearningPath_Courses WHERE path_id = ? ORDER BY order_index ASC").all(pathId) as { course_id: string }[];

  if (courses.length === 0) {
    logger.error(`No courses found for learning path ${pathId}.`);
    return;
  }

  for (const course of courses) {
    await verifyCourseDownloads({ db, courseId: course.course_id, repair });
  }
}

// CLI Integration
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    logger.info("Usage:");
    logger.info("  pnpm exec ts-node src/scripts/verifyDownloads.ts course <courseId> [--repair]");
    logger.info("  pnpm exec ts-node src/scripts/verifyDownloads.ts path <pathId> [--repair]");
    process.exit(1);
  }

  const type = args[0];
  const targetId = args[1];
  const repair = args.includes("--repair");

  (async () => {
    const db = await getDb();
    if (type === "course") {
      await verifyCourseDownloads({ db, courseId: targetId, repair });
    } else if (type === "path") {
      await verifyPathDownloads({ db, pathId: targetId, repair });
    } else {
      logger.info("Unknown command. Use 'course' or 'path'.");
    }
  })().catch(err => {
    logger.error("Fatal error:", err);
    process.exit(1);
  });
}
