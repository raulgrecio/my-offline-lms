import fs from "fs";
import path from "path";

import { db } from "@db/schema";
import { AssetNamingService } from "@features/asset-download/infrastructure/AssetNamingService";
import { ASSETS_DIR } from "@config/paths";

function renameVideosForCourse(courseId: string) {
    const courseVideosDir = path.join(ASSETS_DIR, courseId, "videos");
    if (!fs.existsSync(courseVideosDir)) {
        console.error(`No folder found at ${courseVideosDir}`);
        return;
    }

    const rows = db.prepare("SELECT id, metadata FROM Course_Assets WHERE course_id = ? AND type = 'video' AND status = 'COMPLETED'").all(courseId) as any[];

    console.log(`Checking ${rows.length} completed videos for renaming...`);

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
        const allFiles = fs.readdirSync(courseVideosDir);
        let renamedSomething = false;

        for (const file of allFiles) {
            // A match is something like "Overview.mp4" or "Overview.es.vtt"
            if (file.startsWith(rawName) && !file.startsWith(prefixedName)) {
                // The part after rawName (e.g. ".mp4", ".es.vtt")
                const suffix = file.substring(rawName.length);
                
                const oldPath = path.join(courseVideosDir, file);
                const newPath = path.join(courseVideosDir, `${prefixedName}${suffix}`);
                
                fs.renameSync(oldPath, newPath);
                console.log(`Renamed: ${file} -> ${prefixedName}${suffix}`);
                renamedSomething = true;
            }
        }

        if (renamedSomething) {
            renamedCount++;
        }
    }

    console.log(`All done! Renamed ${renamedCount} videos.`);
}

const args = process.argv.slice(2);
const targetCourse = args[0] || "86212";
renameVideosForCourse(targetCourse);
