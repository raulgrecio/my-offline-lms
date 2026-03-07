import { BrowserProvider } from "../../infrastructure/browser/BrowserProvider";
import { ICourseRepository } from "../../domain/repositories/ICourseRepository";
import { IAssetRepository } from "../../domain/repositories/IAssetRepository";
import { IAssetStorage } from "../../domain/repositories/IAssetStorage";
import { INamingService } from "../../domain/services/INamingService";
import { env } from "../../config/env";
import { ILogger } from "../../domain/services/ILogger";

export class DownloadGuides {
  private browserProvider: BrowserProvider;
  private courseRepo: ICourseRepository;
  private assetRepo: IAssetRepository;
  private assetStorage: IAssetStorage;
  private namingService: INamingService;
  private logger: ILogger;
  private keepTempImages: boolean;

  constructor(deps: {
    browserProvider: BrowserProvider,
    courseRepo: ICourseRepository,
    assetRepo: IAssetRepository,
    assetStorage: IAssetStorage,
    namingService: INamingService,
    logger: ILogger
  }) {
    this.browserProvider = deps.browserProvider;
    this.courseRepo = deps.courseRepo;
    this.assetRepo = deps.assetRepo;
    this.assetStorage = deps.assetStorage;
    this.namingService = deps.namingService;
    this.logger = deps.logger.withContext("DownloadGuides");
    this.keepTempImages = env.KEEP_TEMP_IMAGES;
  }

  async executeForCourse(courseId: string): Promise<void> {
    this.logger.info(`Iniciando descarga de guías para el curso: ${courseId}`);
    
    const pendingGuides = this.assetRepo.getPendingAssets(courseId, 'guide');
    if (pendingGuides.length === 0) {
      this.logger.info(`No hay guías pendientes para el curso ${courseId}.`);
      return;
    }

    this.logger.info(`⏳ Encontradas ${pendingGuides.length} guías pendientes. Comenzando...`);
    
    // Unico navegador para procesar el lote (las guias son pesadas y abrir un navegador por cada una es ineficiente)
    const context = await this.browserProvider.getAuthenticatedContext();

    for (let i = 0; i < pendingGuides.length; i++) {
        this.logger.info(`======================================================`, '');
        this.logger.info(`Guía ${i + 1}/${pendingGuides.length} (ID: ${pendingGuides[i].id})`);
        await this.downloadSingleGuide(pendingGuides[i].id, pendingGuides[i].courseId, context);
        await new Promise(r => setTimeout(r, 2000));
    }

    await this.browserProvider.close();
    this.logger.info(`======================================================`, '');
    this.logger.info(`🎉 Finalizada la descarga de guías del curso ${courseId}.`);
  }

  public async downloadSingleGuide(assetId: string, courseId: string, sharedContext?: any): Promise<void> {
    const asset = this.assetRepo.getAssetById(assetId);
    if (!asset || asset.type !== 'guide') return;

    const meta = asset.metadata;
    if (!meta.ekitId) {
      console.warn(`[DownloadGuides] No hay ekitId válido para ${assetId}. Saltando.`);
      return;
    }

    const courseGuidesDir = this.assetStorage.ensureAssetDir(courseId, 'guides');

    const safeName = this.namingService.generateSafeFilename(meta.title || meta.name || 'guide', meta.order_index);
    const filename = `${safeName}.pdf`;
    const outputPath = `${courseGuidesDir}/${filename}`;

    if (this.assetStorage.assetExists(outputPath)) {
      this.logger.info(`La guía ya existe: ${outputPath}`);
      this.assetRepo.updateAssetCompletion(assetId, { ...meta, filename }, outputPath);
      return;
    }

    let context = sharedContext;
    if (!context) {
      context = await this.browserProvider.getAuthenticatedContext();
    }

    let page = null;
    try {
      this.assetRepo.updateAssetStatus(assetId, 'DOWNLOADING');
      page = await context.newPage();
      const tempImagesDir = this.assetStorage.ensureTempDir(courseId, assetId);
      
      const offeringId = meta.offeringId;
      if (!offeringId) {
        throw new Error(`❌ No se encontró el offeringId para la guía ${assetId}. Asegúrese de haber sincronizado el curso correctamente.`);
      }

      const baseUrl = env.PLATFORM_BASE_URL;
      const viewerUrl = new URL(
        `/ekit/${courseId}/${offeringId}/${meta.ekitId}/course`, 
        baseUrl
      ).href;
      
      this.logger.info(`Navegando al visor de la guía: ${viewerUrl}`);
      await page.goto(viewerUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
      
      const iframeElement = await page.waitForSelector("#ekitIframe", { timeout: 30000 });
      const iframeSrc = await iframeElement?.getAttribute("src");
      if (!iframeSrc) throw new Error("No se pudo extraer el atributo src de #ekitIframe");

      this.logger.info("🪟 Encontrado visor base URL dentro de iframe. Redirigiendo navegador interno...");
      await page.goto(iframeSrc, { waitUntil: "load", timeout: 45000 });
      await page.waitForTimeout(5000);

      // Extraer recuento total de páginas desde el Flip PDF swiper DOM
      let pagesCount = await page.evaluate(() => {
        let highest = 0;
        const titles = Array.from(document.querySelectorAll('.thumbnailSwiper .title'));
        for (const title of titles) {
            const text = title.textContent || "";
            const nums = text.split('-').map(n => parseInt(n.trim(), 10));
            for (const n of nums) {
                if (!isNaN(n) && n > highest) highest = n;
            }
        }
        return highest;
      });

      if (!pagesCount || pagesCount === 0) {
        // Retry
        await page.waitForTimeout(10000);
        pagesCount = await page.evaluate(() => {
          let highest = 0;
          const titles = Array.from(document.querySelectorAll('.thumbnailSwiper .title'));
          for (const title of titles) {
              const text = title.textContent || "";
              const nums = text.split('-').map(n => parseInt(n.trim(), 10));
              for (const n of nums) {
                  if (!isNaN(n) && n > highest) highest = n;
              }
          }
          return highest;
        });
      }

      if (pagesCount === 0) {
        throw new Error("No se detectaron páginas en la estructura thumbnailSwiper del Flip PDF");
      }

      this.logger.info(`📄 Documento Flip PDF cargado con ${pagesCount} páginas.`);

      let baseImgUrl = iframeSrc.replace(/\/mobile\/index\.html(\?.*)?$/i, '/files/mobile/');
      if (!baseImgUrl.endsWith('/')) {
         baseImgUrl += '/';
      }

      // Optimización: Usamos una sola pestaña para descargar todas las imágenes y evitamos agotar el pool
      const downloadPage = await context.newPage();

      for (let i = 0; i < pagesCount; i++) {
         const pageNum = i + 1;
         const imageUrl = `${baseImgUrl}${pageNum}.jpg`;
         const cachedImgPath = `${tempImagesDir}/page_${String(pageNum).padStart(4, '0')}.png`;

         // Skip if we already downloaded this page successfully in a previous run
         if (this.assetStorage.assetExists(cachedImgPath)) {
            const size = this.assetStorage.getTempImageSize(cachedImgPath);
            if (size > 0) {
                this.logger.info(`  -> Saltando pág ${pageNum}/${pagesCount} (Ya existe en caché)`);
                continue;
            }
         }
         
         let buffer: number[] | null = null;
         for (let attempt = 1; attempt <= 3; attempt++) {
            try {
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
              break;
            } catch (e) {
              this.logger.info(`⚠️ Intento ${attempt} fallido bajando pág ${pageNum}. Reintentando...`);
              await new Promise(r => setTimeout(r, 3000));
            }
         }

         if (buffer) {
           this.assetStorage.writeTempImage(cachedImgPath, Buffer.from(buffer));
           this.logger.info(`  -> Descargada pág ${pageNum}/${pagesCount}`);
           // Pequeño delay cortés para no gatillar bloqueos anti-DDoS de Oracle
           await new Promise(r => setTimeout(r, 200));
         } else {
           await downloadPage.close();
           throw new Error(`Imposible descargar la imagen de la página ${pageNum}`);
         }
      }

      await downloadPage.close();

      await page.close();

      this.logger.info(`Construyendo PDF...`);
      await this.assetStorage.buildPDFFromImages(tempImagesDir, outputPath);

      if (!this.keepTempImages) {
        this.assetStorage.removeTempDir(tempImagesDir);
      }

      this.logger.info(`✅ Guía guardada en: ${outputPath}`);
      this.assetRepo.updateAssetCompletion(assetId, { ...meta, filename }, outputPath);

    } catch (err) {
      this.logger.error(`❌ Error extrayendo guía:`, err);
      this.assetRepo.updateAssetStatus(assetId, 'FAILED');
    } finally {
      if (!sharedContext) {
        await this.browserProvider.close();
      } else if (page) {
        await page.close().catch(() => {});
      }
    }
  }


}
