import fs from "fs";
import path from "path";
import { getAssetFilename } from "../../utils/naming";

/**
 * Checks if a video and its subtitles exist for a given course asset.
 */
export function verifyAssetFiles({ courseId, metadataStr, assetsBaseDir }: { courseId: string, metadataStr: string, assetsBaseDir: string }): { videoExists: boolean, vttExists: boolean, safeName: string } {
    const courseVideosDir = path.join(assetsBaseDir, courseId, "videos");
    const meta = JSON.parse(metadataStr || "{}");
    
    const safeName = getAssetFilename(meta.title, {index: String(meta.order_index || '')});

    const expectedVideoPath = path.join(courseVideosDir, `${safeName}.mp4`);
    
    // Check for any .vtt file starting with the expected name (e.g., .en.vtt, .es.vtt)
    let vttExists = false;
    if (fs.existsSync(courseVideosDir)) {
        const files = fs.readdirSync(courseVideosDir);
        vttExists = files.some((f: string) => f.startsWith(safeName) && f.endsWith('.vtt'));
    }

    return {
        videoExists: fs.existsSync(expectedVideoPath),
        vttExists,
        safeName
    };
}
