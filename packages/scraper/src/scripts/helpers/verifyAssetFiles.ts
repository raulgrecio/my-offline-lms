import fs from "fs";
import path from "path";

import { getAssetPathsConfig, getMonorepoRoot } from "@config/paths";

import { AssetType, ASSET_FOLDERS } from '@my-offline-lms/core/models';
import { PathResolver, NodeFileSystem, AssetPathResolver, NodePath } from '@my-offline-lms/core/filesystem';

import { AssetNamingService } from "@features/asset-download/infrastructure/AssetNamingService";
import { NoopLogger } from "@core/logging";

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

export async function verifyAssetFiles({ type, courseId, metadataStr, localPath }: Props): Promise<VerifyAssetFilesResult> {
  const meta = JSON.parse(metadataStr || "{}");
  const namingService = new AssetNamingService();
  const safeName = namingService.generateSafeFilename(meta.name, meta.order_index);

  const fsAdapter = new NodeFileSystem();
  const resolver = new AssetPathResolver({
    configPath: await getAssetPathsConfig(),
    monorepoRoot: await getMonorepoRoot(),
    fs: fsAdapter,
    path: new NodePath(),
    logger: new NoopLogger(),
  });
  await resolver.ensureInitialized();

  // RESERVA DE COINCIDENCIA FUZZY para guías con nombres heredados/cortos (sg, ag, etc.)
  if (localPath && await fsAdapter.exists(localPath)) {
    const isGuide = type === 'guide';
    const vttExists = !isGuide ? (await fsAdapter.readdir(path.dirname(localPath))).some((f: string) => f.startsWith(path.basename(localPath, '.mp4')) && f.endsWith('.vtt')) : false;
    return {
      guideExists: isGuide,
      videoExists: !isGuide,
      vttExists,
      expectedPath: localPath,
      actualPath: localPath,
      safeName
    };
  }

  if (type === 'guide') {
    const filename = meta.filename || `${safeName}.pdf`;
    const foundPath = await resolver.findAsset(courseId, "guide", filename);

    return {
      guideExists: !!foundPath,
      expectedPath: path.join(await resolver.getDefaultWritePath(), courseId, ASSET_FOLDERS.guide, filename),
      actualPath: foundPath || undefined,
      safeName
    };
  }

  // Default to video
  const filename = meta.filename || `${safeName}.mp4`;
  const foundPath = await resolver.findAsset(courseId, "video", filename);

  let vttExists = false;
  if (foundPath) {
    const courseVideosDir = path.dirname(foundPath);
    if (await fsAdapter.exists(courseVideosDir)) {
      const files = await fsAdapter.readdir(courseVideosDir);
      const vttBase = path.basename(filename, path.extname(filename));
      vttExists = files.some((f: string) => f.startsWith(vttBase) && f.endsWith('.vtt'));
    }
  }

  return {
    videoExists: !!foundPath,
    vttExists,
    expectedPath: path.join(await resolver.getDefaultWritePath(), courseId, ASSET_FOLDERS.video, filename),
    actualPath: foundPath || undefined,
    safeName
  };
}
