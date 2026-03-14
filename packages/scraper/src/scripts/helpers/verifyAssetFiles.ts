import fs from "fs";
import path from "path";

import { ASSET_PATHS_CONFIG, MONOREPO_ROOT } from "@config/paths";

import { AssetPathResolver, NodeFileSystem, AssetType, ASSET_FOLDERS } from "@my-offline-lms/core";

import { AssetNamingService } from "@features/asset-download/infrastructure/AssetNamingService";

/**
 * Checks if a video and its subtitles exist for a given course asset.
 */
type VerifyAssetFilesResult = {
    videoExists?: boolean;
    vttExists?: boolean;
    guideExists?: boolean;
    expectedPath: string;
    actualPath?: string;
    safeName: string;
}

interface Props {
    type: AssetType,
    courseId: string,
    metadataStr: string,
    localPath?: string
}

export function verifyAssetFiles({ type, courseId, metadataStr, localPath }: Props): VerifyAssetFilesResult {
    const meta = JSON.parse(metadataStr || "{}");
    const namingService = new AssetNamingService();
    const safeName = namingService.generateSafeFilename(meta.name, meta.order_index);

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
        const foundPath = resolver.findAsset(courseId, "guide", filename);

        return {
            guideExists: !!foundPath,
            expectedPath: path.join(resolver.getDefaultWritePath(), courseId, ASSET_FOLDERS.guide, filename),
            actualPath: foundPath || undefined,
            safeName
        };
    }

    // Default to video
    const filename = meta.filename || `${safeName}.mp4`;
    const foundPath = resolver.findAsset(courseId, "video", filename);

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
        expectedPath: path.join(resolver.getDefaultWritePath(), courseId, ASSET_FOLDERS.video, filename),
        actualPath: foundPath || undefined,
        safeName
    };
}
