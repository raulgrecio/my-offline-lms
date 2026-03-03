import fs from "fs";
import path from "path";
import { BrowserProvider } from "../../infrastructure/browser/BrowserProvider";
import { setupInterceptor } from "../../infrastructure/browser/interceptor";
import { ILearningPathRepository } from "../../domain/repositories/ILearningPathRepository";
import { ICourseRepository } from "../../domain/repositories/ICourseRepository";
import { SyncCourseData } from "./SyncCourseData";
import { env } from "../../config/env";
import { toSlug } from "../../utils/url";

export class SyncLearningPath {
  constructor(
    private browserProvider: BrowserProvider,
    private learningPathRepo: ILearningPathRepository,
    private courseRepo: ICourseRepository,
    private syncCourseData: SyncCourseData
  ) {}

  async execute(targetUrl: string): Promise<void> {
    console.log(`[SyncLearningPath] 🚀 Iniciando mapeo y sincronización de ruta: ${targetUrl}`);
    
    // 1. Extraer datos (Navegador)
    const context = await this.browserProvider.getAuthenticatedContext();
    const page = await context.newPage();
    setupInterceptor(page);
    
    await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
    
    console.log("[SyncLearningPath] Esperando a que el proveedor envíe el listado de courses...");
    await page.waitForTimeout(10000); 
    await page.close();

    // 2. Procesar JSON descargado y Sincronizar Cursos (Base de Datos)
    await this.processInterceptedData();
  }

  private async processInterceptedData(): Promise<void> {
    const debugDir = path.resolve(__dirname, "../../../data/debug");
    if (!fs.existsSync(debugDir)) return;

    const files = fs.readdirSync(debugDir)
      .filter(f => f.includes("content_learning_path_") && f.endsWith("_pagedata.json"));
    
    for (const file of files) {
      const filePath = path.join(debugDir, file);
      const content = fs.readFileSync(filePath, "utf-8");
      const json = JSON.parse(content);

      const lpData = json.data?.lpPageData;
      if (!lpData || !lpData.id || !lpData.containerChildren) continue;

      const pathId = lpData.id;
      const pathTitle = lpData.name;
      const pathSlug = toSlug(pathTitle);
      const pathDesc = lpData.description || "";

      console.log(`[SyncLearningPath] 🧭 Procesando Learning Path: ${pathTitle}`);

      this.learningPathRepo.saveLearningPath({ id: pathId, slug: pathSlug, title: pathTitle, description: pathDesc });

      let orderIndex = 1;
      let coursesAdded = 0;

      for (const child of lpData.containerChildren) {
        if (child.typeId !== "22") continue; // 22 is Standard Course
        if (!child.id || !child.name) continue;

        const courseSlug = toSlug(child.name);
        
        this.courseRepo.saveCourse({ id: child.id, slug: courseSlug, title: child.name });
        this.learningPathRepo.addCourseToPath({ pathId: pathId, courseId: child.id, orderIndex });

        // 👉 Aquí está la clave: Sincronizar automáticamente el contenido interno del curso
        console.log(`[SyncLearningPath] 📥 Sincronizando contenido interno del curso: ${child.name} (${child.id})...`);
        const baseUrl = env.PLATFORM_BASE_URL;
        const courseUrl = new URL(`/ou/course/${courseSlug}/${child.id}`, baseUrl).href;
        await this.syncCourseData.execute(courseUrl);

        orderIndex++;
        coursesAdded++;
      }

      console.log(`[SyncLearningPath] ✅ Vinculados y sincronizados ${coursesAdded} cursos a la ruta ${pathTitle}.`);
      
      // Cleanup file so it's not processed again
      try { fs.unlinkSync(filePath); } catch(e) {}
    }
  }
}
