import { db } from "../db/schema";
import path from "path";
import { verifyAssetFiles } from "./helpers/verifyAssetFiles";

const ASSETS_BASE_DIR = path.resolve(__dirname, "../../data/assets");



/**
 * Verifies all downloaded videos for a specific course.
 */
export function verifyCourseDownloads(courseId: string) {
    console.log(`\n🔍 Verifying downloads for Course ID: ${courseId}`);
    
    const courseRows = db.prepare("SELECT title FROM Courses WHERE id = ?").get(courseId) as { title: string } | undefined;
    if (courseRows) {
        console.log(`   Course Title: ${courseRows.title}`);
    } else {
        console.log(`   (Course not found in database)`);
    }

    const assets = db.prepare("SELECT id, status, metadata FROM Course_Assets WHERE course_id = ? AND type = 'video' ORDER BY json_extract(metadata, '$.order_index') ASC").all(courseId) as any[];

    if (assets.length === 0) {
        console.log(`   No video assets found for this course.`);
        return;
    }

    let missingVideos = 0;
    let missingSubtitles = 0;
    let pendingOrFailed = 0;

    for (const asset of assets) {
        const { videoExists, vttExists, safeName } = verifyAssetFiles({
            courseId,
            metadataStr: asset.metadata,
            assetsBaseDir: ASSETS_BASE_DIR
        });
        
        let statusSymbol = "✅";
        let issues = [];

        if (asset.status !== 'COMPLETED') {
            statusSymbol = "⏳";
            issues.push(`DB Status: ${asset.status}`);
            pendingOrFailed++;
        }

        if (!videoExists) {
            statusSymbol = "❌";
            issues.push("Missing .mp4");
            missingVideos++;
        }

        if (!vttExists && videoExists) {
             // Only flag missing subtitles if the video itself downloaded (sometimes videos genuinely might not have subs)
             statusSymbol = "⚠️";
             issues.push("Missing .vtt (Subtitles)");
             missingSubtitles++;
        }

        if (issues.length > 0) {
             console.log(`   ${statusSymbol} ${safeName}  -> [${issues.join(", ")}]`);
        }
    }

    console.log(`\n📊 Summary for Course ${courseId}:`);
    console.log(`   Total Expected Videos: ${assets.length}`);
    console.log(`   Successfully Downloaded (.mp4): ${assets.length - missingVideos}`);
    console.log(`   Missing Videos (.mp4): ${missingVideos}`);
    console.log(`   Missing Subtitles (.vtt): ${missingSubtitles}`);
    if (pendingOrFailed > 0) console.log(`   Pending/Failed in DB: ${pendingOrFailed}`);
    console.log("---------------------------------------------------");
}

/**
 * Verifies all downloaded videos for all courses within a learning path.
 */
export function verifyPathDownloads(pathId: string) {
    console.log(`\n===================================================`);
    console.log(`🚀 Verifying Learning Path ID: ${pathId}`);
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
        verifyCourseDownloads(course.course_id);
    }
}

// CLI Integration
if (require.main === module) {
    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.log("Usage:");
        console.log("  pnpm exec ts-node src/scripts/verifyDownloads.ts course <courseId>");
        console.log("  pnpm exec ts-node src/scripts/verifyDownloads.ts path <pathId>");
        process.exit(1);
    }

    const type = args[0];
    const targetId = args[1];

    if (type === "course") {
        verifyCourseDownloads(targetId);
    } else if (type === "path") {
        verifyPathDownloads(targetId);
    } else {
        console.log("Unknown command. Use 'course' or 'path'.");
    }
}
