import path from "path";

import { DiskAssetStorage } from "@features/asset-download/infrastructure/DiskAssetStorage";
import { NodeFileSystem, NodePath, AssetPathResolver } from "@my-offline-lms/core/filesystem";
import { getAssetPathsConfig, getMonorepoRoot } from "@config/paths";
import { logger } from "@platform/logging";

async function runTests() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    logger.info("Uso: ts-node src/scripts/testPdfSizes.ts <directorio_imagenes_crudo>");
    logger.info("Ej:  ts-node src/scripts/testPdfSizes.ts data/assets/guides/.temp_594144ed-4db7-453c-a110-0cb40f5b0f87");
    process.exit(1);
  }

  const sourceDir = args[0];
  const ekitId = path.basename(sourceDir).replace(".temp_", "");
  const outputBaseDir = path.dirname(sourceDir);

  const testConfigs = [
    { name: "Sin Optimizacion (Original)", optimize: false, quality: 100 },
    { name: "Optimizado 90%", optimize: true, quality: 90 },
    { name: "Optimizado 70%", optimize: true, quality: 70 },
    { name: "Optimizado 50%", optimize: true, quality: 50 },
  ];

  logger.info(`[Test] Empezando generación de prueba de PDFs desde: ${sourceDir}`);

  const fs = new NodeFileSystem();
  const pathAdapter = new NodePath();
  const resolver = new AssetPathResolver({
    configPath: await getAssetPathsConfig(),
    monorepoRoot: await getMonorepoRoot(),
    fs,
    path: pathAdapter,
    logger,
  });

  // Use the new infrastructure storage implementation with mandatory DI
  const storage = new DiskAssetStorage({
    fs,
    path: pathAdapter,
    resolver,
  });

  for (const config of testConfigs) {
    const label = config.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
    const outFileName = `TEST_${ekitId}_${label}.pdf`;
    const outputPath = path.join(outputBaseDir, outFileName);

    logger.info(`\n---------------------------------`);
    logger.info(`[Test] Ejecutando: ${config.name}`);
    logger.info(`[Test] Parámetros: optimize=${config.optimize}, quality=${config.quality}`);

    const startTime = Date.now();
    try {
      await storage.buildPDFFromImages(sourceDir, outputPath, { optimize: config.optimize, quality: config.quality });
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      logger.info(`[Test] ✅ PDF generado: ${outFileName} (en ${duration}s)`);
    } catch (err) {
      logger.error(`[Test] ❌ Error generando ${config.name}:`, err);
    }
  }

  logger.info(`\n[Test] ¡Pruebas finalizadas! Revisa el directorio: ${outputBaseDir} para comparar tamaños y calidades.`);
}

if (require.main === module) {
  runTests().catch(logger.error);
}
