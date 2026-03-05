import { ICourseRepository, IAssetRepository } from "../../domain/repositories/ICourseRepository";
import { IAssetStorage } from "../../domain/repositories/IAssetStorage";
import { IVideoDownloader } from "../../domain/services/IVideoDownloader";
import { BrowserProvider } from "../../infrastructure/browser/BrowserProvider";
import { PlatformUrl } from "../../domain/value-objects/PlatformUrl";
import { AssetNamingService } from "../../domain/services/AssetNamingService";
import { BrowserContext } from "playwright";

export class DownloadVideos {
  constructor(
    private browserProvider: BrowserProvider,
    private courseRepo: ICourseRepository,
    private assetRepo: IAssetRepository,
    private assetStorage: IAssetStorage,
    private videoDownloader: IVideoDownloader
  ) {
  }

  async executeForCourse(courseId: string): Promise<void> {
    console.log(`[DownloadVideos] Iniciando procesamiento de vídeos para el curso: ${courseId}`);
    
    const pendingVideos = this.assetRepo.getPendingAssets(courseId, 'video');
    if (pendingVideos.length === 0) {
      console.log(`[DownloadVideos] No hay vídeos pendientes para el curso ${courseId}.`);
      return;
    }

    console.log(`[DownloadVideos] ⏳ Encontrados ${pendingVideos.length} vídeos pendientes. Comenzando...`);
    
    // Unico navegador para todo el batch
    const context = await this.browserProvider.getAuthenticatedContext();

    for (let i = 0; i < pendingVideos.length; i++) {
        console.log(`\n======================================================`);
        console.log(`[DownloadVideos] Vídeo ${i + 1}/${pendingVideos.length} (ID: ${pendingVideos[i].id})`);
        await this.downloadSingleVideo(pendingVideos[i].id, pendingVideos[i].courseId, context);
        await new Promise(r => setTimeout(r, 5000));
    }

    await this.browserProvider.close();
    console.log(`\n======================================================`);
    console.log(`[DownloadVideos] 🎉 Finalizada la descarga de vídeos del curso ${courseId}.`);
  }

  public async downloadSingleVideo(assetId: string, courseId: string, sharedContext?: BrowserContext): Promise<void> {
    const asset = this.assetRepo.getAssetById(assetId);
    if (!asset || asset.type !== 'video') return;

    const courseVideosDir = this.assetStorage.ensureAssetDir(courseId, 'videos');

    const safeName = AssetNamingService.generateSafeFilename(asset.metadata.title, asset.metadata.order_index);
    const filename = `${safeName}.mp4`;
    const outputPath = `${courseVideosDir}/${filename}`;

    // [INTEGRITY CHECK] Verificamos si existe el .mp4 y el .vtt si se esperaba
    // yt-dlp guarda los subs incrustados y puede dejarlos sueltos. 
    // Por Clean Architecture, validaremos que al menos el mp4 tiene un tamaño aceptable (>1MB por ejemplo, o simplemente que existe si no fuimos estrictos).
    if (this.assetStorage.verifyVideoIntegrity(outputPath)) {
        console.log(`[DownloadVideos] [Integridad] El vídeo y sus componentes ya parecen existir correctamente: ${outputPath}`);
        this.assetRepo.updateAssetCompletion(assetId, { ...asset.metadata, filename });
        return;
    }

    let context = sharedContext;
    if (!context) {
      context = await this.browserProvider.getAuthenticatedContext();
    }
    
    const page = await context.newPage();
    let m3u8Url = "";

    page.on("request", (req) => {
      const url = req.url();
      if ((url.includes(".m3u8") || url.includes(".mpd")) && !m3u8Url) {
          m3u8Url = url;
      }
    });

    const cleanUrl = PlatformUrl.create(asset.url).getValue();
    try {
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

        await this.videoDownloader.download(targetDownloadUrl, outputPath, cleanUrl);

        // Verificamos tras la descarga!
        if (this.assetStorage.verifyVideoIntegrity(outputPath)) {
            console.log(`[DownloadVideos] ✅ Vídeo completado y verificado: ${outputPath}`);
            this.assetRepo.updateAssetCompletion(assetId, { ...asset.metadata, filename }, outputPath);
        } else {
            console.warn(`[DownloadVideos] ⚠️ Vídeo descargado pero falló el check de integridad (ej. faltan subtitulos o archivo vacio)`);
            this.assetRepo.updateAssetStatus(assetId, 'FAILED');
        }

    } catch (err) {
        console.error(`[DownloadVideos] ❌ Error extrayendo vídeo ${assetId}:`, err);
        this.assetRepo.updateAssetStatus(assetId, 'FAILED');
    } finally {
        if (!sharedContext) {
            await this.browserProvider.close();
        } else {
            await page.close().catch(() => {});
        }
    }
  }


}
