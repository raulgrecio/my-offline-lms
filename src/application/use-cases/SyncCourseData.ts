import fs from "fs";
import path from "path";
import { BrowserProvider } from "../../infrastructure/browser/BrowserProvider";
import { setupInterceptor } from "../../infrastructure/browser/interceptor";
import { ICourseRepository, IAssetRepository } from "../../domain/repositories/ICourseRepository";
import { env } from "../../config/env";

export class SyncCourseData {
  constructor(
    private browserProvider: BrowserProvider,
    private courseRepository: ICourseRepository,
    private assetRepository: IAssetRepository
  ) {}

  async execute(coursePath: string): Promise<void> {
    const baseUrl = env.PLATFORM_BASE_URL;

    let targetUrl = coursePath;
    if (coursePath) {
      if (!coursePath.startsWith('http')) {
        // Form a relative path correctly, ensuring it starts with '/'
        const rawPath = coursePath.startsWith('/') ? coursePath : `/${coursePath}`;
        targetUrl = new URL(rawPath, baseUrl).href;
      }
    } else {
      targetUrl = baseUrl;
    }

    console.log(`[SyncCourseData] 🚀 Iniciando mapeo y sincronización del curso: ${targetUrl}`);
    
    // 1. Extraer datos (Navegador)
    const context = await this.browserProvider.getAuthenticatedContext();
    const page = await context.newPage();
    setupInterceptor(page);
    
    await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
    
    if (targetUrl.includes("/course/")) {
      console.log("[SyncCourseData] Click en el tab de Guides para desencadenar json...");
      try {
        await page.waitForSelector("#guides-tab", { timeout: 15000 });
        await page.click("#guides-tab");
        console.log("[SyncCourseData] 👆 Click en Guides completado. Esperando...");
      } catch (e) {
        // Ignorar
      }
    }
    await page.waitForTimeout(10000); // Dar tiempo a interceptar
    await page.close();

    // 2. Procesar JSON descargado (Base de Datos)
    this.processInterceptedData();
  }

  private processInterceptedData(): void {
    const debugDir = path.resolve(__dirname, "../../../data/debug");
    if (!fs.existsSync(debugDir)) return;

    const files = fs.readdirSync(debugDir)
      .filter(f => f.includes("content_courses_") && f.endsWith("metadata.json"));
    
    for (const file of files) {
      const filePath = path.join(debugDir, file);
      const content = fs.readFileSync(filePath, "utf-8");
      const json = JSON.parse(content);

      if (!json.data || !json.data.id || !json.data.modules) continue;

      const courseData = json.data;
      const courseId = courseData.id;
      const courseTitle = courseData.name;
      const courseSlug = courseTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

      console.log(`[SyncCourseData] 📚 Procesando y guardando Curso: ${courseTitle}`);

      // Save Course
      this.courseRepository.saveCourse({ id: courseId, slug: courseSlug, title: courseTitle });

      let videosCount = 0;
      let pdfsCount = 0;

      // Save Videos
      for (const mod of courseData.modules) {
        for (const comp of mod.components) {
          if (comp.typeId === "1") {
            videosCount++;
            const assetId = "video_" + comp.id;
            const targetUrl = comp.videoId ? "brightcove:" + comp.videoId : new URL(`/ou/course/${courseSlug}/${courseId}/${comp.id}`, env.PLATFORM_BASE_URL).href;
            
            this.assetRepository.saveAsset({
              id: assetId,
              courseId: courseId,
              type: 'video',
              url: targetUrl,
              metadata: {
                title: comp.name,
                duration: comp.duration,
                moduleName: mod.name,
                order_index: videosCount
              },
              status: 'PENDING'
            });
          }
        }
      }

      // Save Guides
      if (courseData.eKits && Array.isArray(courseData.eKits)) {
        for (const kit of courseData.eKits) {
          this.assetRepository.saveAsset({
            id: "pdf_" + kit.id,
            courseId: courseId,
            type: 'guide',
            url: kit.url,
            metadata: {
              title: kit.name,
              ekitId: kit.ekitId,
              fileType: kit.fileType,
              learnerId: kit.learnerId,
              order_index: ++pdfsCount
            },
            status: 'PENDING'
          });
        }
      }

      console.log(`[SyncCourseData] ✅ Sincronizados ${videosCount} vídeos y ${pdfsCount} PDFs.`);
      
      // Cleanup file so it's not processed again on subsequent runs
      try { fs.unlinkSync(filePath); } catch(e) {}
    }
  }
}
