import { SQLiteAssetRepository } from "@infrastructure/database/AssetRepository";
import path from "path";

async function fix79688Guide() {
    const assetRepository = new SQLiteAssetRepository();
    const assetId = "pdf_110015";
    const filename = "S106689GC10_sg.pdf";
    const actualPath = "/mnt/e/oracle-pdfs-videos/assets-082-083/79688/guides/S106689GC10_sg.pdf";

    const asset = assetRepository.getAssetById(assetId);
    if (!asset) {
        console.error(`Asset ${assetId} not found`);
        return;
    }

    console.log(`Updating asset ${assetId} using repository...`);
    const metadata = { ...asset.metadata, filename };
    assetRepository.updateAssetCompletion(assetId, metadata, actualPath);
    console.log("Done.");
}

fix79688Guide();
