import { db } from "../db/schema";
import path from "path";
import { verifyAssetFiles } from "./helpers/verifyAssetFiles";

const ASSETS_BASE_DIR = path.resolve(__dirname, "../../data/assets");

function resetCourse(courseId: string) {
    console.log(`\n🔍 Checking missing assets for Course ID: ${courseId} to reset...`);

    const assets = db.prepare("SELECT id, status, metadata FROM Course_Assets WHERE course_id = ? AND type = 'video'").all(courseId) as any[];

    if (assets.length === 0) {
        return;
    }

    let resetCount = 0;

    for (const asset of assets) {
        const { videoExists, vttExists, safeName } = verifyAssetFiles({
            courseId,
            metadataStr: asset.metadata,
            assetsBaseDir: ASSETS_BASE_DIR
        });
        
        // We want to reset it if either the video is missing OR the subtitles are missing
        if (!videoExists || !vttExists) {
            
            // Only update the DB if it is not already PENDING to avoid infinite loops or overwriting downloading states unnecessarily
            if (asset.status !== 'PENDING') {
                 db.prepare("UPDATE Course_Assets SET status = 'PENDING' WHERE id = ?").run(asset.id);
                 
                 let reason = !videoExists ? "Missing .mp4" : "Missing .vtt";
                 console.log(`   🔄 Resetting ${safeName} to PENDING (${reason})`);
                 resetCount++;
            }
        }
    }
    
    if (resetCount > 0) {
        console.log(`   ✅ Reset ${resetCount} videos to PENDING status for Course ${courseId}.`);
    } else {
        console.log(`   No videos needed resetting in Course ${courseId}.`);
    }
}

function resetPath(pathId: string) {
    console.log(`\n===================================================`);
    console.log(`🚀 Resetting missing videos in Learning Path ID: ${pathId}`);
    console.log(`===================================================`);

    const courses = db.prepare("SELECT course_id FROM LearningPath_Courses WHERE path_id = ? ORDER BY order_index ASC").all(pathId) as { course_id: string }[];

    for (const course of courses) {
        resetCourse(course.course_id);
    }
}

// CLI Integration
if (require.main === module) {
    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.log("Usage:");
        console.log("  pnpm exec ts-node src/scripts/resetFailedDownloads.ts course <courseId>");
        console.log("  pnpm exec ts-node src/scripts/resetFailedDownloads.ts path <pathId>");
        process.exit(1);
    }

    const type = args[0];
    const targetId = args[1];

    if (type === "course") {
        resetCourse(targetId);
    } else if (type === "path") {
        resetPath(targetId);
    } else {
        console.log("Unknown command. Use 'course' or 'path'.");
    }
}
