import { BrowserContext } from "playwright";

import { ILogger } from '@my-offline-lms/core/logging';

import { IAssetRepository } from "@features/asset-download/domain/ports/IAssetRepository";
import { IAssetStorage } from "@features/asset-download/domain/ports/IAssetStorage";
import { INamingService } from "@features/asset-download/domain/ports/INamingService";
import { IVideoDownloader } from "@features/asset-download/domain/ports/IVideoDownloader";
import { ICourseRepository } from "@features/platform-sync/domain/ports/ICourseRepository";
import { IBrowserProvider } from "@platform/browser/IBrowserProvider";

export interface DownloadVideosConfig {
  selectors: {
    video: {
      startBtn: string;
      playBtn: string;
    };
  };
}

export class DownloadVideos {
  private browserProvider: IBrowserProvider;
  private courseRepo: ICourseRepository;
  private assetRepo: IAssetRepository;
  private assetStorage: IAssetStorage;
  private videoDownloader: IVideoDownloader;
  private namingService: INamingService;
  private logger: ILogger;
  private config: DownloadVideosConfig;

  constructor(deps: {
    browserProvider: IBrowserProvider,
    courseRepository: ICourseRepository,
    assetRepository: IAssetRepository,
    assetStorage: IAssetStorage,
    videoDownloader: IVideoDownloader,
    namingService: INamingService,
    logger: ILogger,
    config: DownloadVideosConfig
  }) {
    this.browserProvider = deps.browserProvider;
    this.courseRepo = deps.courseRepository;
    this.assetRepo = deps.assetRepository;
    this.assetStorage = deps.assetStorage;
    this.videoDownloader = deps.videoDownloader;
    this.namingService = deps.namingService;
    this.logger = deps.logger.withContext("DownloadVideos");
    this.config = deps.config;
  }

  async executeForCourse(courseId: string): Promise<void> {
    this.logger.info(`Iniciando procesamiento de vídeos para el curso: ${courseId}`);

    const pendingVideos = this.assetRepo.getPendingAssets(courseId, 'video');
    if (pendingVideos.length === 0) {
      this.logger.info(`No hay vídeos pendientes para el curso ${courseId}.`);
      return;
    }

    this.logger.info(`⏳ Encontrados ${pendingVideos.length} vídeos pendientes. Comenzando...`);

    // Unico navegador para todo el batch
    const context = await this.browserProvider.getAuthenticatedContext();

    for (let i = 0; i < pendingVideos.length; i++) {
      this.logger.info(`======================================================`, "");
      this.logger.info(`Vídeo ${i + 1}/${pendingVideos.length} (ID: ${pendingVideos[i].id})`);
      await this.downloadSingleVideo(pendingVideos[i].id, pendingVideos[i].courseId, context);
      await new Promise(r => setTimeout(r, 5000));
    }

    await this.browserProvider.close();
    this.logger.info(`======================================================`, "");
    this.logger.info(`🎉 Finalizada la descarga de vídeos del curso ${courseId}.`);
  }

  public async downloadSingleVideo(assetId: string, courseId: string, sharedContext?: BrowserContext): Promise<void> {
    const asset = this.assetRepo.getAssetById(assetId);
    if (!asset || asset.type !== 'video') return;

    const safeName = this.namingService.generateSafeFilename(asset.metadata.name, asset.metadata.order_index);
    const filename = `${safeName}.mp4`;
    const courseVideosDir = await this.assetStorage.ensureAssetDir(courseId, 'video');
    const outputPath = `${courseVideosDir}/${filename}`;

    // [INTEGRITY CHECK] Verificamos si existe el .mp4 y el .vtt si se esperaba
    // yt-dlp guarda los subs incrustados y puede dejarlos sueltos. 
    // Por Clean Architecture, validaremos que al menos el mp4 tiene un tamaño aceptable (>1MB por ejemplo, o simplemente que existe si no fuimos estrictos).
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
      
      // Detección de redirección a login
      const currentUrl = page.url();
      const isLoginPage = currentUrl.includes("identity.oraclecloud.com") || 
                          currentUrl.includes("login") || 
                          (await page.title()).toLowerCase().includes("oracle identity cloud service");

      if (isLoginPage) {
        throw new Error("Página redirigida a login. La sesión ha expirado o no es válida. Ejecuta 'pnpm cli login'.");
      }

      await page.waitForTimeout(18000);

      const videoId = asset.url.split('/').pop();
      if (videoId) {
        try {
          const startLearningBtn = page.locator(this.config.selectors.video.startBtn).first();
          await startLearningBtn.waitFor({ state: 'visible', timeout: 5000 });
          await startLearningBtn.click({ force: true });
          await page.waitForTimeout(2000);
        } catch (e) {
          this.logger.debug?.(`Botón 'Start Learning' no encontrado o no necesario para el vídeo ${assetId}`);
        }

        try {
          const playButton = page.locator(this.config.selectors.video.playBtn).first();
          await playButton.waitFor({ state: 'visible', timeout: 4000 });
          await playButton.click({ force: true });
        } catch (e) {
          this.logger.debug?.(`Botón 'Play' no encontrado para el vídeo ${assetId}`);
        }
      }

      await page.waitForTimeout(15000);

      if (!m3u8Url) {
          this.logger.warn(`⚠️ No se detectó stream de vídeo (.m3u8). Esto suele ocurrir por falta de login.`);
      }
      const targetDownloadUrl = m3u8Url || cleanUrl;

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

    } catch (err) {
      this.logger.error(`❌ Error extrayendo vídeo ${assetId}:`, err);
      this.assetRepo.updateAssetStatus(assetId, 'FAILED');
    } finally {
      if (page) {
        await page.close().catch(() => { });
      }
      if (!sharedContext && context) {
        await this.browserProvider.close();
      }
    }
  }
}
