import path from "path";

import { db } from "@db/schema";
import { verifyAssetFiles } from "./helpers/verifyAssetFiles";
import { ASSETS_DIR } from "@config/paths";

function resetCourse(courseId: string) {
    console.log(`\n🔍 Checking missing assets for Course ID: ${courseId} to reset...`);

    const assets = db.prepare("SELECT id, type, status, metadata FROM Course_Assets WHERE course_id = ?").all(courseId) as any[];

    if (assets.length === 0) {
        return;
    }

    let resetCount = 0;

    for (const asset of assets) {
        const { videoExists, vttExists, guideExists, safeName } = verifyAssetFiles({
            type: asset.type,
            courseId,
            metadataStr: asset.metadata,
            assetsBaseDir: ASSETS_DIR
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
             
             console.log(`   🔄 Resetting [${asset.type.toUpperCase()}] ${safeName} to PENDING (${reason})`);
             resetCount++;
        }
    }
    
    if (resetCount > 0) {
        console.log(`   ✅ Reset ${resetCount} assets to PENDING status for Course ${courseId}.`);
    } else {
        console.log(`   No assets needed resetting in Course ${courseId}.`);
    }
}

function resetPath(pathId: string) {
    console.log(`\n===================================================`);
    console.log(`🚀 Resetting missing assets in Learning Path ID: ${pathId}`);
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
