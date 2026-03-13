import path from "path";

import { DiskAssetStorage } from "@features/asset-download/infrastructure/DiskAssetStorage";

async function runTests() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.log("Uso: ts-node src/scripts/testPdfSizes.ts <directorio_imagenes_crudo>");
    console.log("Ej:  ts-node src/scripts/testPdfSizes.ts data/assets/guides/.temp_594144ed-4db7-453c-a110-0cb40f5b0f87");
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

  console.log(`[Test] Empezando generación de prueba de PDFs desde: ${sourceDir}`);

  // Use the new infrastructure storage implementation
  const storage = new DiskAssetStorage();

  for (const config of testConfigs) {
    const label = config.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
    const outFileName = `TEST_${ekitId}_${label}.pdf`;
    const outputPath = path.join(outputBaseDir, outFileName);

    console.log(`\n---------------------------------`);
    console.log(`[Test] Ejecutando: ${config.name}`);
    console.log(`[Test] Parámetros: optimize=${config.optimize}, quality=${config.quality}`);

    const startTime = Date.now();
    try {
      await storage.buildPDFFromImages(sourceDir, outputPath, { optimize: config.optimize, quality: config.quality });
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`[Test] ✅ PDF generado: ${outFileName} (en ${duration}s)`);
    } catch (err) {
      console.error(`[Test] ❌ Error generando ${config.name}:`, err);
    }
  }

  console.log(`\n[Test] ¡Pruebas finalizadas! Revisa el directorio: ${outputBaseDir} para comparar tamaños y calidades.`);
}

if (require.main === module) {
  runTests().catch(console.error);
}
