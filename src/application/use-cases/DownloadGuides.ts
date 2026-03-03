import path from "path";
import fs from "fs";
import PDFDocument from "pdfkit";
import sharp from "sharp";
import { BrowserProvider } from "../../infrastructure/browser/BrowserProvider";
import { ICourseRepository, IAssetRepository } from "../../domain/repositories/ICourseRepository";
import { ensureDir } from "../../utils/fs";
import { getAssetFilename } from "../../utils/naming";
import { env } from "../../config/env";

export interface PDFOptions {
  optimize: boolean;
  quality: number;
}

export class DownloadGuides {
  private assetsBaseDir: string;
  private keepTempImages: boolean;

  constructor(
    private browserProvider: BrowserProvider,
    private courseRepo: ICourseRepository,
    private assetRepo: IAssetRepository
  ) {
    this.assetsBaseDir = path.resolve(__dirname, "../../../data/assets");
    this.keepTempImages = env.KEEP_TEMP_IMAGES;
  }

  async executeForCourse(courseId: string): Promise<void> {
    console.log(`[DownloadGuides] Iniciando descarga de guías para el curso: ${courseId}`);
    
    const pendingGuides = this.assetRepo.getPendingAssets(courseId, 'guide');
    if (pendingGuides.length === 0) {
      console.log(`[DownloadGuides] No hay guías pendientes para el curso ${courseId}.`);
      return;
    }

    console.log(`[DownloadGuides] ⏳ Encontradas ${pendingGuides.length} guías pendientes. Comenzando...`);
    
    // Unico navegador para procesar el lote (las guias son pesadas y abrir un navegador por cada una es ineficiente)
    const context = await this.browserProvider.getAuthenticatedContext();

    for (let i = 0; i < pendingGuides.length; i++) {
        console.log(`\n======================================================`);
        console.log(`[DownloadGuides] Guía ${i + 1}/${pendingGuides.length} (ID: ${pendingGuides[i].id})`);
        await this.downloadSingleGuide(pendingGuides[i].id, pendingGuides[i].courseId, context);
        await new Promise(r => setTimeout(r, 2000));
    }

    await this.browserProvider.close();
    console.log(`\n======================================================`);
    console.log(`[DownloadGuides] 🎉 Finalizada la descarga de guías del curso ${courseId}.`);
  }

  public async downloadSingleGuide(assetId: string, courseId: string, sharedContext?: any): Promise<void> {
    const asset = this.assetRepo.getAssetById(assetId);
    if (!asset || asset.type !== 'guide') return;

    const meta = asset.metadata;
    if (!meta.ekitId) {
      console.warn(`[DownloadGuides] No hay ekitId válido para ${assetId}. Saltando.`);
      return;
    }

    const courseGuidesDir = path.join(this.assetsBaseDir, String(courseId), "guides");
    ensureDir(courseGuidesDir);

    const safeName = getAssetFilename(meta.title || meta.name || 'guide', {index: String(meta.order_index || '')});
    const filename = `${safeName}.pdf`;
    const outputPath = path.join(courseGuidesDir, filename);

    if (fs.existsSync(outputPath)) {
      console.log(`[DownloadGuides] La guía ya existe: ${outputPath}`);
      this.assetRepo.updateAssetCompletion(assetId, { ...meta, filename }, outputPath);
      return;
    }

    let context = sharedContext;
    if (!context) {
      context = await this.browserProvider.getAuthenticatedContext();
    }

    const page = await context.newPage();
    const tempImagesDir = path.join(courseGuidesDir, `temp_${assetId}`);
    ensureDir(tempImagesDir);

    try {
      this.assetRepo.updateAssetStatus(assetId, 'DOWNLOADING');
      
      const learnerId = "38560"; // TODO: Should probably come from ENV or Auth
      const urlBase = new URL(env.PLATFORM_BASE_URL).origin; 
      const viewerUrl = `${urlBase}/ou/ekit/${courseId}/${learnerId}/${meta.ekitId}/course`;
      
      console.log(`[DownloadGuides] Navegando al visor de la guía: ${viewerUrl}`);
      await page.goto(viewerUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
      
      const iframeElement = await page.waitForSelector("#ekitIframe", { timeout: 30000 });
      const iframeSrc = await iframeElement?.getAttribute("src");
      if (!iframeSrc) throw new Error("No se pudo extraer el atributo src de #ekitIframe");

      console.log("[DownloadGuides] 🪟 Encontrado visor base URL dentro de iframe. Redirigiendo navegador interno...");
      await page.goto(iframeSrc, { waitUntil: "networkidle", timeout: 45000 });
      await page.waitForTimeout(5000);

      // Extract window.pdfObj.pages
      const pagesCount = await page.evaluate(() => {
        return (window as any).pdfObj?.pages?.length || 0;
      });

      if (pagesCount === 0) {
        throw new Error("No se detectaron páginas en window.pdfObj");
      }

      console.log(`[DownloadGuides] 📄 Documento cargado con ${pagesCount} páginas.`);

      for (let i = 0; i < pagesCount; i++) {
         // Lógica de descarga de la imagen de cada página interceptando blob (Simplificada para el plan)
         // ... (este sería el bloque detallado que ya tienes en scraper/guideDownloader.ts lines 230-360)
         // Simularemos un retraso o llamada de inyección para mantener la demostración de la arquitectura.
         
         const imageUrl = await page.evaluate(async (pageNum: number) => {
             return new Promise<string>((resolve) => {
                 const originalPage = (window as any).pdfObj.pages[pageNum];
                 const id = originalPage.id;
                 (window as any).pdfObj.pageImageManager.getImageURL(id, (url: string) => {
                     resolve(url);
                 });
             });
         }, i);

         if (!imageUrl) continue;
         
         // Navegar al blob o descargarlo a disco directamente.
         let buffer: number[] | null = null;
         for (let attempt = 1; attempt <= 3; attempt++) {
            try {
              const downloadPage = await context.newPage();
              await downloadPage.goto(imageUrl, { waitUntil: 'load', timeout: 30000 });
              buffer = await downloadPage.evaluate(async (url: string) => {
                  const res = await fetch(url);
                  const blob = await res.blob();
                  return new Promise<number[]>((resolve) => {
                      const reader = new FileReader();
                      reader.onload = () => resolve(Array.from(new Uint8Array(reader.result as ArrayBuffer)));
                      reader.readAsArrayBuffer(blob);
                  });
              }, imageUrl);
              await downloadPage.close();
              break;
            } catch (e) {
              console.log(`[DownloadGuides] ⚠️ Intento ${attempt} fallido bajando pág ${i+1}. Reintentando...`);
              await new Promise(r => setTimeout(r, 2000));
            }
         }

         if (buffer) {
           fs.writeFileSync(path.join(tempImagesDir, `page_${String(i).padStart(4, '0')}.png`), Buffer.from(buffer));
           console.log(`[DownloadGuides]   -> Descargada pág ${i+1}/${pagesCount}`);
         } else {
           throw new Error(`Imposible descargar la imagen de la página ${i+1}`);
         }
      }

      await page.close();

      console.log(`[DownloadGuides] Construyendo PDF...`);
      await this.buildPDF(tempImagesDir, outputPath);

      if (!this.keepTempImages) {
        fs.rmSync(tempImagesDir, { recursive: true, force: true });
      }

      console.log(`[DownloadGuides] ✅ Guía guardada en: ${outputPath}`);
      this.assetRepo.updateAssetCompletion(assetId, { ...meta, filename }, outputPath);

    } catch (err) {
      console.error(`[DownloadGuides] ❌ Error extrayendo guía:`, err);
      this.assetRepo.updateAssetStatus(assetId, 'FAILED');
    } finally {
      if (!sharedContext) {
        await this.browserProvider.close();
      } else {
        await page.close().catch(() => {});
      }
    }
  }

  private async buildPDF(sourceDir: string, outputPath: string, options: PDFOptions = { optimize: false, quality: 80 }): Promise<void> {
    return new Promise((resolve, reject) => {
      const files = fs.readdirSync(sourceDir).filter(f => f.endsWith(".png")).sort();
      if (files.length === 0) {
        return reject(new Error("No hay imágenes para crear PDF"));
      }

      const doc = new PDFDocument({ autoFirstPage: false });
      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);

      (async () => {
        try {
          for (const file of files) {
            const imgPath = path.join(sourceDir, file);
            if (options.optimize) {
              const optBuffer = await sharp(imgPath).jpeg({ quality: options.quality }).toBuffer();
              const meta = await sharp(optBuffer).metadata();
              doc.addPage({ size: [meta.width!, meta.height!], margin: 0 });
              doc.image(optBuffer, 0, 0, { width: meta.width, height: meta.height });
            } else {
              const meta = await sharp(imgPath).metadata();
              doc.addPage({ size: [meta.width!, meta.height!], margin: 0 });
              doc.image(imgPath, 0, 0, { width: meta.width, height: meta.height });
            }
          }
          doc.end();
        } catch(e) { reject(e); }
      })();

      stream.on("finish", () => resolve());
      stream.on("error", (e) => reject(e));
    });
  }
}
