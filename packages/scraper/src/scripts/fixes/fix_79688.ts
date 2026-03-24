import { SQLiteAssetRepository } from "@features/asset-download/infrastructure/AssetRepository";
import { initDb } from "@db/schema";
import { logger } from "@platform/logging";

async function fix79688Guide() {
  const db = await initDb();
  const assetRepository = new SQLiteAssetRepository(db);
  const assetId = "pdf_110015";
  const filename = "S106689GC10_sg.pdf";
  const actualPath = "/mnt/e/oracle-pdfs-videos/assets-082-083/79688/guides/S106689GC10_sg.pdf";

  const asset = assetRepository.getAssetById(assetId);
  if (!asset) {
    logger.error(`Asset ${assetId} not found`);
    return;
  }

  logger.info(`Updating asset ${assetId} using repository...`);
  const metadata = { ...asset.metadata, filename };
  assetRepository.updateAssetCompletion(assetId, metadata, actualPath);
  logger.info("Done.");
}

fix79688Guide();
