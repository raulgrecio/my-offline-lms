import { chromium } from "playwright-extra";
import stealth from "puppeteer-extra-plugin-stealth";
import fs from "fs";
import path from "path";
import { ensureDir } from "../utils/fs";
import { sanitizeUrl } from "../utils/url";
import { requireValidSession } from "../utils/auth";
import { spawn } from "child_process";
import { db } from "../db/schema";
import dotenv from "dotenv";

dotenv.config();

chromium.use(stealth());

const STATE_FILE = path.resolve(__dirname, "../../data/.auth/state.json");
const COOKIES_FILE = path.resolve(__dirname, "../../data/.auth/cookies.txt");
const ASSETS_BASE_DIR = path.resolve(__dirname, "../../data/assets");


/**
 * Función auxiliar para ejecutar yt-dlp mediante child_process
 */
async function runYtDlp(videoUrl: string, outputPath: string, referer?: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Argumentos base
    const args = [
      "--cookies", COOKIES_FILE,
      "-o", outputPath,
      // Usar el mejor formato disponible y combinarlo a mp4 al final
      "-f", "bestvideo+bestaudio/best",
      "--merge-output-format", "mp4",
      // Descargar e incrustar subtítulos en español e inglés simultáneamente
      "--write-subs",
      "--write-auto-subs",
      "--sub-langs", "es.*,en.*",
      "--embed-subs"
    ];

    if (referer) {
      args.push("--referer", referer);
    }

    args.push(videoUrl);

    console.log(`[VideoDownloader] Ejecutando yt-dlp...`);
    
    const ytDlpProcess = spawn("yt-dlp", args, { stdio: "inherit" });

    ytDlpProcess.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`yt-dlp terminó con código de error ${code}`));
      }
    });

    ytDlpProcess.on("error", (err) => {
      reject(new Error(`Error ejecutando yt-dlp: ${err.message}`));
    });
  });
}

import { BrowserContext, Request } from "playwright";

/**
 * Extrae y descarga un vídeo específico
 */
export async function downloadVideo(courseId: string, assetId: string, sharedContext?: BrowserContext) {
  // Crear estructura: data/assets/<courseId>/videos
  const courseBaseDir = path.join(ASSETS_BASE_DIR, String(courseId));
  ensureDir(courseBaseDir);
  
  const courseVideosDir = path.join(courseBaseDir, "videos");
  ensureDir(courseVideosDir);

  const row = db.prepare("SELECT url, metadata FROM Course_Assets WHERE id = ?").get(assetId) as { url: string, metadata: string };
  
  if (!row || !row.url) {
    console.error(`[VideoDownloader] No se encontró URL para el asset ${assetId}`);
    return;
  }

  const meta = JSON.parse(row.metadata || "{}");
  
  // Limpiar el nombre para sistema de archivos
  let safeName = meta.name ? meta.name.replace(/[^a-zA-Z0-9 _-]/g, '').trim().replace(/ +/g, '_') : assetId;
  
  if (meta.orderIndex) {
      const prefix = String(meta.orderIndex).padStart(2, '0');
      safeName = `${prefix}_${safeName}`;
  }

  let filename = `${safeName}.mp4`;
  const outputPath = path.join(courseVideosDir, filename);

  if (fs.existsSync(outputPath)) {
    console.log(`[VideoDownloader] El vídeo ya existe: ${outputPath}`);
    db.prepare("UPDATE Course_Assets SET status = 'COMPLETED' WHERE id = ?").run(assetId);
    return;
  }

  if (!fs.existsSync(STATE_FILE)) {
    throw new Error("No existe sesion guardada. Ejecute el login primero.");
  }

  // Si nos pasan un contexto compartido (batch), lo usamos. Si no (CLI test), lanzamos uno propio.
  let browserForLocal: any = null;
  let context = sharedContext;
  
  if (!context) {
    browserForLocal = await chromium.launch({ headless: true });
    context = await browserForLocal.newContext({ storageState: STATE_FILE });
  }

  const page = await context!.newPage();

  console.log(`[VideoDownloader] Analizando visor de vídeo: ${row.url}`);

  let m3u8Url = "";

  page.on("request", (req: Request) => {
    const url = req.url();
    const type = req.resourceType();
    
    // Loock for XHR, fetch, and media
    if (type === "xhr" || type === "fetch" || type === "media" || type === "websocket") {
       if (!url.includes(".png") && !url.includes(".jpg") && !url.includes(".svg")) {
         console.log(`[VideoDownloader NET] [${type.toUpperCase()}] ${url.substring(0, 150)}...`);
       }
    }

    if ((url.includes(".m3u8") || url.includes(".mpd")) && !m3u8Url) {
      console.log(`[VideoDownloader] 🎯 ¡Manifiesto HLS/DASH detectado!`);
      // Si la URL es de Brightcove, podríamos quedarnos solo con el manifesto
      m3u8Url = url;
    }
  });
  const cleanUrl = sanitizeUrl(row.url);

  try {
    console.log(`[VideoDownloader] Navegando a ${cleanUrl}...`);
    await page.goto(cleanUrl, { waitUntil: "domcontentloaded", timeout: 45000 });

    console.log(`[VideoDownloader] Esperando carga de la estructura base SPA (18s)...`);
    await page.waitForTimeout(18000); 

    const videoId = row.url.split('/').pop();
    if (videoId) {
        // 0. Click "Start Learning" / "Resume Learning" si existe (común en cursos nuevos)
        const startLearningBtn = page.locator('#playerIdbtn').first();
        if (await startLearningBtn.isVisible({ timeout: 5000 })) {
            console.log(`[VideoDownloader] 🖱️ Click en botón de inicio de curso ("Start/Resume Learning")...`);
            await startLearningBtn.click({ force: true });
            await page.waitForTimeout(5000); // Esperar a que el reproductor se inyecte en el DOM
        }

        const videoLinkSelector = `a[href*="/${videoId}"]`;
        const linkLocator = page.locator(videoLinkSelector).first();

        let playlistClicked = false;
        // 1. Intentar hacer click en la playlist
        if (await linkLocator.isVisible({ timeout: 5000 })) {
            console.log(`[VideoDownloader] 🖱️ Click en la playlist para forzar carga del reproductor HLS...`);
            await linkLocator.click();
            playlistClicked = true;
            await page.waitForTimeout(10000); // Darle tiempo a procesar el click de routing
        }

        console.log(`[VideoDownloader] 🖱️ Buscando botones de Play genéricos y haciendo click en el vídeo...`);
        // 2. Click sobre un botón de play si existe
        const playButton = page.locator('.vjs-big-play-button, button[aria-label="Play"]').first();
        if (await playButton.isVisible({ timeout: 2000 })) {
            console.log(`[VideoDownloader] 🖱️ Encontrado botón Start/Play, clickeando...`);
            await playButton.click({ force: true });
        } else if (!playlistClicked) {
            // 3. Fallback final: click "ciego" en componente de video en lugar de coordenadas SOLO si no hicimos click en la playlist
            const videoArea = page.locator('.vjs-tech, video, .vjs-poster, #oudl_video_id_html5_api').first();
            if (await videoArea.isVisible({ timeout: 2000 })) {
                console.log(`[VideoDownloader] 🖱️ Realizando click forzado en el área del reproductor...`);
                await videoArea.click({ force: true });
            } else {
                const vp = page.viewportSize();
                if (vp) {
                    console.log(`[VideoDownloader] 🖱️ Realizando click ciego en coordenadas como último recurso...`);
                    await page.mouse.click(vp.width * 0.4, vp.height * 0.4);
                }
            }
        }
    }

    // Esperar a que el click dispare la petición m3u8 real en la red
    console.log(`[VideoDownloader] Esperando a que el proveedor negocie el stream (15s)...`);
    await page.waitForTimeout(15000);

    let targetDownloadUrl = cleanUrl;

    // yt-dlp es EXCELENTE extrayendo vídeos si le pasas directamente el stream maestro
    if (m3u8Url) {
      console.log(`[VideoDownloader] 🌟 EXITO: Utilizando enlace maestro m3u8 directo para yt-dlp.`);
      targetDownloadUrl = m3u8Url;
    } else {
      console.log(`[VideoDownloader] ⚠️ No se interceptó .m3u8. Intentando que yt-dlp analice la url base.`);
    }

    // Actualizar estado a descargando
    db.prepare("UPDATE Course_Assets SET status = 'DOWNLOADING' WHERE id = ?").run(assetId);
    
    // Cerramos la pestaña de playwright porque yt-dlp se encargará de bajarlo como proceso secundario
    await page.close();

    // Invocar a yt-dlp
    await runYtDlp(targetDownloadUrl, outputPath, cleanUrl);
    
    console.log(`[VideoDownloader] ✅ Vídeo Guardado en: ${outputPath}`);

    // Actualizar Base de Datos con éxito y nombre limpio
    meta.filename = filename;
    db.prepare("UPDATE Course_Assets SET status = 'COMPLETED', metadata = ? WHERE id = ?").run(JSON.stringify(meta), assetId);

  } catch (err) {
    console.error(`[VideoDownloader] ❌ Error extrayendo vídeo ${assetId}:`, err);
    try {
      db.prepare("UPDATE Course_Assets SET status = 'FAILED' WHERE id = ?").run(assetId);
    } catch(e) {}
  } finally {
    if (browserForLocal) {
        await browserForLocal.close();
    } else {
        // En batch, solo cerramos la página para no contaminar RAM
        await page.close().catch(() => {});
    }
  }
}

/**
 * Descarga todos los vídeos pendientes de un curso
 */
export async function downloadCourseVideos(courseId: string) {
  await requireValidSession();
  
  console.log(`[BatchDownloader] Iniciando procesamiento de vídeos para el curso: ${courseId}`);
  
  try {
    const rows = db.prepare("SELECT id FROM Course_Assets WHERE course_id = ? AND type = 'video' AND status != 'COMPLETED'").all(courseId) as { id: string }[];
    
    if (rows.length === 0) {
      console.log(`[BatchDownloader] No hay vídeos pendientes para el curso ${courseId}.`);
      return;
    }
    
    console.log(`[BatchDownloader] ⏳ Encontrados ${rows.length} vídeos pendientes. Comenzando...`);
    
    // Inicializar un unico navegador para todo el batch
    console.log(`[BatchDownloader] Inicializando instancia única de Chromium...`);
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ storageState: STATE_FILE });

    for (let i = 0; i < rows.length; i++) {
      console.log(`\n======================================================`);
      console.log(`[BatchDownloader] Vídeo ${i + 1}/${rows.length} (ID: ${rows[i].id})`);
      await downloadVideo(courseId, rows[i].id, context);
      
      // Breve pausa para no saturar al servidor
      await new Promise(r => setTimeout(r, 5000));
    }

    await browser.close();

    console.log(`\n======================================================`);
    console.log(`[BatchDownloader] 🎉 Finalizada la descarga de vídeos del curso ${courseId}.`);
    
  } catch (err) {
    console.error("[BatchDownloader] Error consultando SQLite:", err);
  }
}

// Interfaz CLI
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log("Uso descarga masiva curso:  ts-node src/downloader/videos.ts <courseId>");
    console.log("Uso descarga individual:    ts-node src/downloader/videos.ts <courseId> <assetId>");
    process.exit(1);
  }
  
  if (args.length === 1) {
    downloadCourseVideos(args[0]).catch(console.error);
  } else {
    downloadVideo(args[0], args[1]).catch(console.error);
  }
}
