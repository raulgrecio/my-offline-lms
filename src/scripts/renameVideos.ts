import { db } from "../db/schema";
import fs from "fs";
import path from "path";

const ASSETS_BASE_DIR = path.resolve(__dirname, "../../data/assets");

function renameVideosForCourse(courseId: string) {
    const courseVideosDir = path.join(ASSETS_BASE_DIR, courseId, "videos");
    if (!fs.existsSync(courseVideosDir)) {
        console.error(`No folder found at ${courseVideosDir}`);
        return;
    }

    const rows = db.prepare("SELECT id, metadata FROM Course_Assets WHERE course_id = ? AND type = 'video' AND status = 'COMPLETED'").all(courseId) as any[];

    console.log(`Checking ${rows.length} completed videos for renaming...`);

    let renamedCount = 0;

    for (const row of rows) {
        const meta = JSON.parse(row.metadata || "{}");
        
        let rawName = meta.name ? meta.name.replace(/[^a-zA-Z0-9 _-]/g, '').trim().replace(/ +/g, '_') : row.id;
        
        if (!meta.orderIndex) {
            continue; // Nothing to prefix
        }

        const prefix = String(meta.orderIndex).padStart(2, '0');
        const prefixedName = `${prefix}_${rawName}`;

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
