import path from "path";
import { db } from "@db/schema";
import { verifyAssetFiles } from "./helpers/verifyAssetFiles";
import { ASSETS_DIR } from "@config/paths";
import { SQLiteAssetRepository } from "@features/asset-download/infrastructure/AssetRepository";

const assetRepository = new SQLiteAssetRepository(db);

/**
 * Verifies all downloaded videos for a specific course.
 */
export async function verifyCourseDownloads({ courseId, repair }: { courseId: string, repair?: boolean }) {
    console.log(`\n🔍 Verifying downloads for Course ID: ${courseId}${repair ? ' [MODE: REPAIR]' : ''}`);
    
    const courseRows = db.prepare("SELECT title FROM Courses WHERE id = ?").get(courseId) as { title: string } | undefined;
    if (courseRows) {
        console.log(`   Course Title: ${courseRows.title}`);
    } else {
        console.log(`   (Course not found in database)`);
    }

    // Get ALL assets for the course (videos and guides)
    const assets = db.prepare("SELECT id, type, status, metadata, local_path FROM Course_Assets WHERE course_id = ? ORDER BY type, json_extract(metadata, '$.order_index') ASC").all(courseId) as any[];

    if (assets.length === 0) {
        console.log(`   No assets found for this course.`);
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

        if (actualPath && !actualPath.includes(ASSETS_DIR)) {
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
             console.log(`   ${statusSymbol} [${asset.type.toUpperCase()}] ${safeName}${locationNote}  -> [${issues.join(", ")}]`);
        } else if (locationNote) {
             console.log(`   ${statusSymbol} [${asset.type.toUpperCase()}] ${safeName}${locationNote}`);
        }
    }

    console.log(`\n📊 Summary for Course ${courseId}:`);
    console.log(`   Total Assets: ${assets.length} (${totalVideos} vids, ${totalGuides} guides)`);
    console.log(`   Found on disk: ${assets.length - missingFiles}`);
    console.log(`   Missing on disk: ${missingFiles}`);
    if (healedCount > 0) console.log(`   ✨ Healed in DB: ${healedCount}`);
    
    console.log("---------------------------------------------------");
}

/**
 * Verifies all downloaded videos for all courses within a learning path.
 */
export async function verifyPathDownloads({ pathId, repair = false }: { pathId: string, repair?: boolean }) {
    console.log(`\n===================================================`);
    console.log(`🚀 Verifying Learning Path ID: ${pathId}${repair ? ' [MODE: REPAIR]' : ''}`);
    console.log(`===================================================`);

    const pathRows = db.prepare("SELECT title FROM LearningPaths WHERE id = ?").get(pathId) as { title: string } | undefined;
    if (pathRows) {
        console.log(`Path Title: ${pathRows.title}`);
    }

    const courses = db.prepare("SELECT course_id FROM LearningPath_Courses WHERE path_id = ? ORDER BY order_index ASC").all(pathId) as { course_id: string }[];

    if (courses.length === 0) {
        console.error(`No courses found for learning path ${pathId}.`);
        return;
    }

    for (const course of courses) {
        await verifyCourseDownloads({courseId: course.course_id, repair});
    }
}

// CLI Integration
if (require.main === module) {
    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.log("Usage:");
        console.log("  pnpm exec ts-node src/scripts/verifyDownloads.ts course <courseId> [--repair]");
        console.log("  pnpm exec ts-node src/scripts/verifyDownloads.ts path <pathId> [--repair]");
        process.exit(1);
    }

    const type = args[0];
    const targetId = args[1];
    const repair = args.includes("--repair");

    (async () => {
        if (type === "course") {
            await verifyCourseDownloads({courseId: targetId, repair});
        } else if (type === "path") {
            await verifyPathDownloads({pathId: targetId, repair});
        } else {
            console.log("Unknown command. Use 'course' or 'path'.");
        }
    })().catch(err => {
        console.error("Fatal error:", err);
        process.exit(1);
    });
}
