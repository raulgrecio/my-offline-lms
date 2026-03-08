import fs from "fs";
import path from "path";
import { AssetNamingService } from "@domain/services/AssetNamingService";
import { AssetPathResolver } from "@core/assets/domain/services/AssetPathResolver";
import { NodeFileSystem } from "@core/assets/infrastructure/adapters/NodeFileSystem";
import { MONOREPO_ROOT, ASSET_PATHS_CONFIG } from "@config/paths";

/**
 * Checks if a video and its subtitles exist for a given course asset.
 */
export function verifyAssetFiles({ type, courseId, metadataStr, localPath }: { type: 'guide' | 'video', courseId: string, metadataStr: string, localPath?: string }): { videoExists?: boolean, vttExists?: boolean, guideExists?: boolean, expectedPath: string, actualPath?: string, safeName: string } {
    const meta = JSON.parse(metadataStr || "{}");
    const namingService = new AssetNamingService();
    const safeName = namingService.generateSafeFilename(meta.title, meta.order_index);
    
    const fsAdapter = new NodeFileSystem();
    const resolver = new AssetPathResolver({
        configPath: ASSET_PATHS_CONFIG,
        monorepoRoot: MONOREPO_ROOT,
        fs: fsAdapter
    });

    // RESERVA DE COINCIDENCIA FUZZY para guías con nombres heredados/cortos (sg, ag, etc.)
    if (localPath && fs.existsSync(localPath)) {
        const isGuide = type === 'guide';
        return {
            guideExists: isGuide,
            videoExists: !isGuide,
            vttExists: !isGuide ? fs.readdirSync(path.dirname(localPath)).some((f: string) => f.startsWith(path.basename(localPath, '.mp4')) && f.endsWith('.vtt')) : false,
            expectedPath: localPath,
            actualPath: localPath,
            safeName
        };
    }

    if (type === 'guide') {
        const filename = meta.filename || `${safeName}.pdf`;
        const foundPath = resolver.findAsset(courseId, "guides", filename);
        
        return {
            guideExists: !!foundPath,
            expectedPath: path.join(resolver.getDefaultWritePath(), courseId, "guides", filename),
            actualPath: foundPath || undefined,
            safeName
        };
    }

    // Default to video
    const filename = meta.filename || `${safeName}.mp4`;
    const foundPath = resolver.findAsset(courseId, "videos", filename);
    
    let vttExists = false;
    if (foundPath) {
        const courseVideosDir = path.dirname(foundPath);
        if (fs.existsSync(courseVideosDir)) {
            const files = fs.readdirSync(courseVideosDir);
            const vttBase = path.basename(filename, path.extname(filename));
            vttExists = files.some((f: string) => f.startsWith(vttBase) && f.endsWith('.vtt'));
        }
    }

    return {
        videoExists: !!foundPath,
        vttExists,
        expectedPath: path.join(resolver.getDefaultWritePath(), courseId, "videos", filename),
        actualPath: foundPath || undefined,
        safeName
    };
}
