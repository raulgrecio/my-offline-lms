import { type ILogger } from '@core/logging';

import { type IUseCase } from '@scraper/features/shared';
import { type ICourseRepository } from "@scraper/features/platform-sync";
import { type IPlatformUrlProvider } from "@scraper/features/platform-sync";
import { type IBrowserProvider } from "@scraper/platform/browser";

import { type IAssetRepository } from "../domain/ports/IAssetRepository";
import { type IAssetStorage } from "../domain/ports/IAssetStorage";
import { type INamingService } from "../domain/ports/INamingService";

export interface DownloadGuidesConfig {
  keepTempImages: boolean;
  selectors: {
    iframe: string;
    flipbookPages: string;
  };
}

export interface DownloadGuidesInput {
  courseId: string;
  taskId?: string;
}

export interface DownloadGuidesOptions {
  browserProvider: IBrowserProvider;
  courseRepo: ICourseRepository;
  assetRepo: IAssetRepository;
  assetStorage: IAssetStorage;
  namingService: INamingService;
  urlProvider: IPlatformUrlProvider;
  logger: ILogger;
  config: DownloadGuidesConfig;
}

export class DownloadGuides implements IUseCase<DownloadGuidesInput, void> {
  private browserProvider: IBrowserProvider;
  private courseRepo: ICourseRepository;
  private assetRepo: IAssetRepository;
  private assetStorage: IAssetStorage;
  private namingService: INamingService;
  private urlProvider: IPlatformUrlProvider;
  private logger: ILogger;
  private config: DownloadGuidesConfig;

  constructor(options: DownloadGuidesOptions) {
    this.browserProvider = options.browserProvider;
    this.courseRepo = options.courseRepo;
    this.assetRepo = options.assetRepo;
    this.assetStorage = options.assetStorage;
    this.namingService = options.namingService;
    this.urlProvider = options.urlProvider;
    this.logger = options.logger.withContext("DownloadGuides");
    this.config = options.config;
  }

  async execute(input: DownloadGuidesInput, signal?: AbortSignal): Promise<void> {
    const { courseId } = input;
    this.logger.info(`Iniciando descarga de guías para el curso: ${courseId}`);

    const pendingGuides = this.assetRepo.getPendingAssets(courseId, 'guide');
    if (pendingGuides.length === 0) {
      this.logger.info(`No hay guías pendientes para el curso ${courseId}.`);
      return;
    }

    this.logger.info(`⏳ Encontradas ${pendingGuides.length} guías pendientes. Comenzando...`);

    // Unico navegador para procesar el lote (las guias son pesadas y abrir un navegador por cada una es ineficiente)
    const context = await this.browserProvider.getAuthenticatedContext({}, signal);

    try {
      for (let i = 0; i < pendingGuides.length; i++) {
        if (signal?.aborted) return;

        this.logger.info(`======================================================`);
        this.logger.info(`Guía ${i + 1}/${pendingGuides.length} (ID: ${pendingGuides[i].id})`);
        await this.downloadSingleGuide({
          assetId: pendingGuides[i].id,
          courseId: pendingGuides[i].courseId,
          sharedContext: context,
          signal
        });
        await new Promise(r => setTimeout(r, 2000));
      }
    } finally {
      await this.browserProvider.closeContext(context);
    }

    this.logger.info(`======================================================`);
    this.logger.info(`🎉 Finalizada la descarga de guías del curso ${courseId}.`);
  }

  public async downloadSingleGuide(options: {
    assetId: string,
    courseId: string,
    sharedContext?: any,
    signal?: AbortSignal
  }): Promise<void> {
    const { assetId, courseId, sharedContext, signal } = options;
    const asset = this.assetRepo.getAssetById(assetId);
    if (!asset || asset.type !== 'guide') return;

    const meta = asset.metadata;
    if (!meta.ekitId) {
      this.logger.warn(`No hay ekitId válido para ${assetId}. Saltando.`);
      return;
    }


    let baseName;
    if (meta.gcc) {
      const ekitTypeStr = meta.ekitType ? String(meta.ekitType) : "";
      const suffix = ekitTypeStr === "1" ? "_sg" : (ekitTypeStr === "2" ? "_ag" : "");
      baseName = `${meta.gcc}${suffix}`;
    }

    if (!baseName) {
      this.logger.warn(`No se pudo generar un nombre base para la guía ${assetId}.`);
      baseName = this.namingService.generateSafeFilename(meta.name || 'guide', meta.order_index);
    }

    const filename = `${baseName}.pdf`;
    const courseGuidesDir = await this.assetStorage.ensureAssetDir(courseId, 'guide');
    const outputPath = `${courseGuidesDir}/${filename}`;

    if (await this.assetStorage.assetExists(outputPath)) {
      this.logger.info(`La guía ya existe: ${outputPath}`);
      this.assetRepo.updateAssetCompletion(assetId, { ...meta, filename }, outputPath);
      return;
    }

    // RESERVA: Si el metadata ya tiene un filename (ej: de una sync previa u otro scraper), buscarlo en todas las rutas
    if (meta.filename) {
      const existingPath = await this.assetStorage.findExistingAsset(courseId, 'guide', meta.filename);
      if (existingPath) {
        this.logger.info(`La guía ya existe (nombre en meta): ${existingPath}`);
        this.assetRepo.updateAssetCompletion(assetId, meta, existingPath);
        return;
      }
    }

    let context = sharedContext;
    let page = null;
    try {
      if (!context) {
        context = await this.browserProvider.getAuthenticatedContext();
      }
      this.assetRepo.updateAssetStatus(assetId, 'DOWNLOADING');
      page = await context.newPage();
      const tempImagesDir = await this.assetStorage.ensureTempDir(courseId, assetId);

      const offeringId = meta.offeringId;
      if (!offeringId) {
        throw new Error(`❌ No se encontró el offeringId para la guía ${assetId}. Asegúrese de haber sincronizado el curso correctamente.`);
      }

      const viewerUrl = this.urlProvider.getGuideViewerUrl({ courseId, offeringId, ekitId: meta.ekitId });

      this.logger.info(`Navegando al visor de la guía: ${viewerUrl}`);
      await page.goto(viewerUrl, { waitUntil: "domcontentloaded", timeout: 45000 });

      const iframeElement = await page.waitForSelector(this.config.selectors.iframe, { timeout: 30000 });
      const iframeSrc = await iframeElement?.getAttribute("src");
      if (!iframeSrc) throw new Error(`No se pudo extraer el atributo src de ${this.config.selectors.iframe}`);

      this.logger.info("🪟 Encontrado visor base URL dentro de iframe. Redirigiendo navegador interno...");
      await page.goto(iframeSrc, { waitUntil: "load", timeout: 45000 });
      await page.waitForTimeout(5000);

      // Extraer recuento total de páginas desde el Flip PDF swiper DOM
      let pagesCount = await page.evaluate(DownloadGuides.extractHighestPageNumber, this.config.selectors.flipbookPages);

      if (!pagesCount || pagesCount === 0) {
        // Retry
        await page.waitForTimeout(10000);
        pagesCount = await page.evaluate(DownloadGuides.extractHighestPageNumber, this.config.selectors.flipbookPages);
      }

      if (pagesCount === 0) {
        throw new Error(`No se detectaron páginas en la estructura ${this.config.selectors.flipbookPages} del Flip PDF`);
      }

      this.logger.info(`📄 Documento Flip PDF cargado con ${pagesCount} páginas.`);

      const baseImgUrl = this.urlProvider.getGuideImageBaseUrl(iframeSrc);

      // Optimización: Usamos una sola pestaña para descargar todas las imágenes y evitamos agotar el pool
      const downloadPage = await context.newPage();

      for (let i = 0; i < pagesCount; i++) {
        if (signal?.aborted) return;
        const pageNum = i + 1;
        const imageUrl = `${baseImgUrl}${pageNum}.jpg`;
        const cachedImgPath = `${tempImagesDir}/page_${String(pageNum).padStart(4, '0')}.png`;

        // Skip if we already downloaded this page successfully in a previous run
        if (await this.assetStorage.assetExists(cachedImgPath)) {
          const size = await this.assetStorage.getTempImageSize(cachedImgPath);
          if (size > 0) {
            this.logger.info(`  -> Saltando pág ${pageNum}/${pagesCount} (Ya existe en caché)`);
            continue;
          }
        }

        let buffer: number[] | null = null;
        for (let attempt = 1; attempt <= 3; attempt++) {
          if (signal?.aborted) return;
          try {
            await downloadPage.goto(imageUrl, { waitUntil: 'load', timeout: 30000 });
            buffer = await downloadPage.evaluate(DownloadGuides.downloadImageAsArray, imageUrl);
            break;
          } catch (e) {
            this.logger.info(`⚠️ Intento ${attempt} fallido bajando pág ${pageNum}. Reintentando...`);
            await new Promise(r => setTimeout(r, 3000));
          }
        }

        if (buffer) {
          await this.assetStorage.writeTempImage(cachedImgPath, Buffer.from(buffer));
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

      if (!this.config.keepTempImages) {
        await this.assetStorage.removeTempDir(tempImagesDir);
      }

      this.logger.info(`✅ Guía guardada en: ${outputPath}`);
      this.assetRepo.updateAssetCompletion(assetId, { ...meta, filename }, outputPath);

    } catch (err) {
      this.logger.error(`❌ Error extrayendo guía:`, err);
      this.assetRepo.updateAssetStatus(assetId, 'FAILED');
    } finally {
      if (!sharedContext && context) {
        await this.browserProvider.closeContext(context);
      } else if (page) {
        await page.close().catch(() => { });
      }
    }
  }


  /**
   * Lógica interna del navegador para extraer el número máximo de páginas.
   * Se extrae a un método estático para poder ser testeado unitariamente.
   */
  public static extractHighestPageNumber(selector: string): number {
    let highest = 0;
    const titles = Array.from(document.querySelectorAll(selector));
    for (const title of titles) {
      const text = title.textContent || "";
      const nums = text.split('-').map(n => parseInt(n.trim(), 10));
      for (const n of nums) {
        if (!isNaN(n) && n > highest) highest = n;
      }
    }
    return highest;
  }

  /**
   * Lógica interna del navegador para descargar una imagen como array de bytes.
   * Se extrae a un método estático para poder ser testeado unitariamente.
   */
  public static async downloadImageAsArray(url: string): Promise<number[]> {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise<number[]>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(Array.from(new Uint8Array(reader.result as ArrayBuffer)));
      reader.readAsArrayBuffer(blob);
    });
  }
}
