import { type BrowserContext } from "playwright";

import { type ILogger } from '@core/logging';

import { type IUseCase } from '@scraper/features/shared';
import { type ICourseRepository } from "@scraper/features/platform-sync";
import { type IBrowserProvider } from "@scraper/platform/browser";
import { AbortContext, TASK_CANCELLED_ERROR } from '@scraper/features/task-management';

import { type IAssetRepository } from "../domain/ports/IAssetRepository";
import { type IAssetStorage } from "../domain/ports/IAssetStorage";
import { type INamingService } from "../domain/ports/INamingService";
import { type IVideoDownloader } from "../domain/ports/IVideoDownloader";
import { type IAuthValidator } from "@scraper/features/auth-session";

export interface DownloadVideosConfig {
  selectors: {
    video: {
      startBtn: string;
      playBtn: string;
    };
  };
}

export interface DownloadVideosInput {
  courseId: string;
  taskId?: string;
}

export interface DownloadVideosOptions {
  browserProvider: IBrowserProvider;
  courseRepository: ICourseRepository;
  assetRepository: IAssetRepository;
  assetStorage: IAssetStorage;
  videoDownloader: IVideoDownloader;
  namingService: INamingService;
  validator: IAuthValidator;
  logger: ILogger;
  config: DownloadVideosConfig;
}

export class DownloadVideos implements IUseCase<DownloadVideosInput, void> {
  private browserProvider: IBrowserProvider;
  private courseRepo: ICourseRepository;
  private assetRepo: IAssetRepository;
  private assetStorage: IAssetStorage;
  private videoDownloader: IVideoDownloader;
  private namingService: INamingService;
  private validator: IAuthValidator;
  private logger: ILogger;
  private config: DownloadVideosConfig;

  constructor(options: DownloadVideosOptions) {
    this.browserProvider = options.browserProvider;
    this.courseRepo = options.courseRepository;
    this.assetRepo = options.assetRepository;
    this.assetStorage = options.assetStorage;
    this.videoDownloader = options.videoDownloader;
    this.namingService = options.namingService;
    this.validator = options.validator;
    this.logger = options.logger.withContext("DownloadVideos");
    this.config = options.config;
  }

  async execute(input: DownloadVideosInput): Promise<void> {
    AbortContext.throwIfAborted();

    const { courseId } = input;
    this.logger.info(`Iniciando procesamiento de vídeos para el curso: ${courseId}`);

    const pendingVideos = this.assetRepo.getPendingAssets(courseId, 'video');
    if (pendingVideos.length === 0) {
      this.logger.info(`No hay vídeos pendientes para el curso ${courseId}.`);
      return;
    }

    this.logger.info(`⏳ Encontrados ${pendingVideos.length} vídeos pendientes. Comenzando...`);

    // Unico navegador para procesar el lote (las guias son pesadas y abrir un navegador por cada una es ineficiente)
    const context = await this.browserProvider.getAuthenticatedContext();

    try {
      for (let i = 0; i < pendingVideos.length; i++) {
        await this.downloadSingleVideo(pendingVideos[i].id, pendingVideos[i].courseId, context);
        this.logger.info(`======================================================`);
        this.logger.info(`Vídeo ${i + 1}/${pendingVideos.length} (ID: ${pendingVideos[i].id})`);
        await new Promise(r => setTimeout(r, 5000));
      }
    } finally {
      await this.browserProvider.closeContext(context);
    }

    this.logger.info(`======================================================`);
    this.logger.info(`🎉 Finalizada la descarga de vídeos del curso ${courseId}.`);
  }

  public async downloadSingleVideo(assetId: string, courseId: string, sharedContext?: BrowserContext): Promise<void> {
    AbortContext.throwIfAborted();

    const asset = this.assetRepo.getAssetById(assetId);
    if (!asset || asset.type !== 'video') return;

    const safeName = this.namingService.generateSafeFilename(asset.metadata.name, asset.metadata.order_index);
    const filename = `${safeName}.mp4`;
    const courseVideosDir = await this.assetStorage.ensureAssetDir(courseId, 'video');
    const outputPath = `${courseVideosDir}/${filename}`;

    // [INTEGRITY CHECK] Verificamos si existe el .mp4 y el .vtt si se esperaba
    if (await this.assetStorage.verifyVideoIntegrity(outputPath)) {
      this.logger.info(`[Integridad] El vídeo y sus componentes ya parecen existir correctamente: ${outputPath}`);
      this.assetRepo.updateAssetCompletion(assetId, { ...asset.metadata, filename }, outputPath);
      return;
    }

    let context = sharedContext;
    let page: any = null;

    try {
      if (!context) {
        context = await this.browserProvider.getAuthenticatedContext();
      }

      page = await context.newPage();
      let m3u8Url = "";

      page.on("request", (req: any) => {
        const url = req.url();
        if ((url.includes(".m3u8") || url.includes(".mpd")) && !m3u8Url) {
          m3u8Url = url;
        }
      });

      const cleanUrl = this.namingService.cleanUrl(asset.url);
      const res = await page.goto(cleanUrl, { waitUntil: "domcontentloaded", timeout: 45000 });

      // Detección de redirección a login (URL, Título o Contenido) usando el validador
      const currentUrl = page.url();
      const pageTitle = await page.title();
      const hasSignText = await page.locator("text=Sign In").isVisible();

      const isLoginPage = this.validator.isLoginPage({
        url: currentUrl,
        title: pageTitle,
        hasLoginText: hasSignText
      });

      if (isLoginPage) {
        throw new Error("Página redirigida a login. La sesión ha expirado o no es válida. Ejecuta 'pnpm cli login'.");
      }

      // Esperar a que el reproductor o contenido cargue
      await page.waitForTimeout(10000);

      const videoId = asset.url.split('/').pop();
      if (videoId) {
        try {
          // Intentar encontrar el botón de Play o Start Learning si el vídeo no arranca solo
          const selectors = [
            this.config.selectors.video.startBtn,
            this.config.selectors.video.playBtn,
            "button[aria-label='Play Video']",
            ".vjs-play-control"
          ];

          for (const selector of selectors) {
            const btn = page.locator(selector).first();
            if (await btn.isVisible()) {
              this.logger.debug?.(`Clic en control de vídeo: ${selector}`);
              await btn.click({ force: true });
              await page.waitForTimeout(2000);
            }
          }
        } catch (e: any) {
          this.logger.debug?.(`Interacción de vídeo omitida o fallida para ${assetId}: ${e.message}`);
        }
      }

      // Tiempo de espera final para captura de red (el stream suele saltar tras el primer play)
      await page.waitForTimeout(15000);

      if (!m3u8Url) {
        // Intento final: buscar en el DOM si hay algún elemento vídeo con src (menos común en Oracle pero posible)
        const videoSrc = await page.locator('video source').first().getAttribute('src').catch(() => null);
        if (videoSrc && (videoSrc.includes('.m3u8') || videoSrc.includes('.mp4'))) {
          m3u8Url = videoSrc;
        }
      }

      if (!m3u8Url) {
        throw new Error("No se pudo detectar el stream de vídeo (.m3u8). La página cargó pero el reproductor no inició el stream.");
      }
      
      const targetDownloadUrl = m3u8Url;

      this.assetRepo.updateAssetStatus(assetId, 'DOWNLOADING');
      await page.close(); // Liberar memoria de playwright antes de yt-dlp
      page = null; // Mark as closed

      await this.videoDownloader.download(targetDownloadUrl, outputPath, cleanUrl);

      // Verificamos tras la descarga!
      if (await this.assetStorage.verifyVideoIntegrity(outputPath)) {
        this.logger.info(`✅ Vídeo completado y verificado: ${outputPath}`);
        this.assetRepo.updateAssetCompletion(assetId, { ...asset.metadata, filename }, outputPath);
      } else {
        this.logger.warn(`⚠️ Vídeo descargado pero falló el check de integridad (ej. faltan subtitulos o archivo vacio)`);
        this.assetRepo.updateAssetStatus(assetId, 'FAILED');
      }

    } catch (err: any) {
      // Re-lanzar errores de cancelación para que lleguen al orquestador
      if (err?.message === TASK_CANCELLED_ERROR) throw err;
      this.logger.error(`❌ Error extrayendo vídeo ${assetId}:`, err);
      this.assetRepo.updateAssetStatus(assetId, 'FAILED');
    } finally {
      if (page) {
        await page.close().catch(() => { });
      }
      if (!sharedContext && context) {
        await this.browserProvider.closeContext(context);
      }
    }
  }
}
