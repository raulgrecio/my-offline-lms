import path from "path";
import fs from "fs";
import { spawn } from "child_process";
import { ICourseRepository, IAssetRepository } from "../../domain/repositories/ICourseRepository";
import { BrowserProvider } from "../../infrastructure/browser/BrowserProvider";
import { ensureDir } from "../../utils/fs";
import { sanitizeUrl } from "../../utils/url";
import { getAssetFilename } from "../../utils/naming";
import { BrowserContext } from "playwright";

export class DownloadVideos {
  private assetsBaseDir: string;
  private cookiesFile: string;

  constructor(
    private browserProvider: BrowserProvider,
    private courseRepo: ICourseRepository,
    private assetRepo: IAssetRepository
  ) {
    this.assetsBaseDir = path.resolve(__dirname, "../../../data/assets");
    this.cookiesFile = path.resolve(__dirname, "../../../data/.auth/cookies.txt");
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

    const courseVideosDir = path.join(this.assetsBaseDir, String(courseId), "videos");
    ensureDir(courseVideosDir);

    const safeName = getAssetFilename(asset.metadata.title, {index: String(asset.metadata.order_index || '')});
    const filename = `${safeName}.mp4`;
    const outputPath = path.join(courseVideosDir, filename);

    // [INTEGRITY CHECK] Verificamos si existe el .mp4 y el .vtt si se esperaba
    // yt-dlp guarda los subs incrustados y puede dejarlos sueltos. 
    // Por Clean Architecture, validaremos que al menos el mp4 tiene un tamaño aceptable (>1MB por ejemplo, o simplemente que existe si no fuimos estrictos).
    if (this.verifyIntegrity(outputPath)) {
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

    const cleanUrl = sanitizeUrl(asset.url);
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

        await this.execYtDlp(targetDownloadUrl, outputPath, cleanUrl);

        // Verificamos tras la descarga!
        if (this.verifyIntegrity(outputPath)) {
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

  private verifyIntegrity(videoPath: string): boolean {
    // Regla de Negocio: Para marcar un video COMPLETED, el .mp4 debe existir y pesar al menos 200KB.
    // También validaremos si existen subtítulos asociados (opcional dependiendo si la plataforma falló en proveerlos, 
    // pero por ahora solo exigiremos que el archivo no esté corrupto/vacío).
    if (!fs.existsSync(videoPath)) return false;
    const stats = fs.statSync(videoPath);
    if (stats.size < 200000) return false; // less than 200KB is definitely a failed dash manifest disguised as mp4
    return true;
  }

  private async execYtDlp(url: string, outputPath: string, referer?: string, retryCount = 0): Promise<void> {
    return new Promise((resolve, reject) => {
      const args = [
        "--cookies", this.cookiesFile,
        "-o", outputPath,
        "-f", "bestvideo+bestaudio/best",
        "--merge-output-format", "mp4",
        "--write-subs",
        "--write-auto-subs",
        "--sub-langs", "es.*,en.*",
        "--embed-subs"
      ];
      if (referer) args.push("--referer", referer);
      args.push(url);

      const ytDlpProcess = spawn("yt-dlp", args, { stdio: "inherit" });
      
      ytDlpProcess.on("close", (code) => {
          if (code === 0) {
              resolve();
          } else {
              if (retryCount < 3) {
                  const delay = 5000 * (retryCount + 1); // Exponential-ish backoff: 5s, 10s, 15s
                  console.log(`[DownloadVideos] ⚠️ yt-dlp devolvió error ${code}. Reintentando en ${delay/1000} segundos... (Intento ${retryCount + 1}/3)`);
                  setTimeout(() => {
                      this.execYtDlp(url, outputPath, referer, retryCount + 1).then(resolve).catch(reject);
                  }, delay);
              } else {
                  reject(new Error(`yt-dlp error ${code} después de 3 reintentos`));
              }
          }
      });
      ytDlpProcess.on("error", (err) => reject(err));
    });
  }
}
