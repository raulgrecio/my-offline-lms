import { IAssetRepository } from "../../domain/repositories/IAssetRepository";
import { ICourseRepository } from "../../domain/repositories/ICourseRepository";
import { IAssetStorage } from "../../domain/repositories/IAssetStorage";
import { IVideoDownloader } from "../../domain/services/IVideoDownloader";
import { BrowserProvider } from "../../infrastructure/browser/BrowserProvider";
import { INamingService } from "../../domain/services/INamingService";
import { AssetNamingService } from "../../domain/services/AssetNamingService";
import { BrowserContext } from "playwright";
import { ILogger } from "../../domain/services/ILogger";

export class DownloadVideos {
  private browserProvider: BrowserProvider;
  private courseRepo: ICourseRepository;
  private assetRepo: IAssetRepository;
  private assetStorage: IAssetStorage;
  private videoDownloader: IVideoDownloader;
  private namingService: INamingService;
  private logger: ILogger;

  constructor(deps: {
    browserProvider: BrowserProvider,
    courseRepository: ICourseRepository,
    assetRepository: IAssetRepository,
    assetStorage: IAssetStorage,
    videoDownloader: IVideoDownloader,
    namingService: INamingService,
    logger: ILogger
  }) {
    this.browserProvider = deps.browserProvider;
    this.courseRepo = deps.courseRepository;
    this.assetRepo = deps.assetRepository;
    this.assetStorage = deps.assetStorage;
    this.videoDownloader = deps.videoDownloader;
    this.namingService = deps.namingService;
    this.logger = deps.logger.withContext("DownloadVideos");
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

    const courseVideosDir = this.assetStorage.ensureAssetDir(courseId, 'videos');

    const safeName = this.namingService.generateSafeFilename(asset.metadata.title, asset.metadata.order_index);
    const filename = `${safeName}.mp4`;
    const outputPath = `${courseVideosDir}/${filename}`;

    // [INTEGRITY CHECK] Verificamos si existe el .mp4 y el .vtt si se esperaba
    // yt-dlp guarda los subs incrustados y puede dejarlos sueltos. 
    // Por Clean Architecture, validaremos que al menos el mp4 tiene un tamaño aceptable (>1MB por ejemplo, o simplemente que existe si no fuimos estrictos).
    if (this.assetStorage.verifyVideoIntegrity(outputPath)) {
        this.logger.info(`[Integridad] El vídeo y sus componentes ya parecen existir correctamente: ${outputPath}`);
        this.assetRepo.updateAssetCompletion(assetId, { ...asset.metadata, filename });
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
      
      await page.goto(cleanUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
      await page.waitForTimeout(18000); 

      const videoId = asset.url.split('/').pop();
      if (videoId) {
          const startLearningBtn = page.locator('#playerIdbtn').first();
          if (await startLearningBtn.isVisible({ timeout: 5000 })) {
              await startLearningBtn.click({ force: true });
              await page.waitForTimeout(5000);
          }
          // Trigger routing/player
          const playButton = page.locator('.vjs-big-play-button, button[aria-label="Play"]').first();
          if (await playButton.isVisible({ timeout: 4000 })) await playButton.click({ force: true });
      }

      await page.waitForTimeout(15000); // Dar a la API tiempo de negociar m3u8

      let targetDownloadUrl = m3u8Url || cleanUrl;
      
      this.assetRepo.updateAssetStatus(assetId, 'DOWNLOADING');
      await page.close(); // Liberar memoria de playwright antes de yt-dlp
      page = null; // Mark as closed

      await this.videoDownloader.download(targetDownloadUrl, outputPath, cleanUrl);

      // Verificamos tras la descarga!
      if (this.assetStorage.verifyVideoIntegrity(outputPath)) {
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
            await page.close().catch(() => {});
        }
        if (!sharedContext && context) {
            await this.browserProvider.close();
        }
    }
  }


}
