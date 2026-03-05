import fs from "fs";
import path from "path";
import { getAssetFilename } from "../../utils/naming";

/**
 * Checks if a video and its subtitles exist for a given course asset.
 */
export function verifyAssetFiles({ type, courseId, metadataStr, assetsBaseDir }: { type: string, courseId: string, metadataStr: string, assetsBaseDir: string }): { videoExists?: boolean, vttExists?: boolean, guideExists?: boolean, expectedPath: string, safeName: string } {
    const meta = JSON.parse(metadataStr || "{}");
    const safeName = getAssetFilename(meta.title, {index: String(meta.order_index || '')});

    if (type === 'guide') {
        const courseGuidesDir = path.join(assetsBaseDir, courseId, "guides");
        const expectedGuidePath = path.join(courseGuidesDir, `${safeName}.pdf`);
        return {
            guideExists: fs.existsSync(expectedGuidePath),
            expectedPath: expectedGuidePath,
            safeName
        };
    }

    // Default to video
    const courseVideosDir = path.join(assetsBaseDir, courseId, "videos");
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
        expectedPath: expectedVideoPath,
        safeName
    };
}
