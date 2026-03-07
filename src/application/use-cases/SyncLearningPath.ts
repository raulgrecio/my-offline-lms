import { IInterceptedDataRepository } from "@domain/repositories/IInterceptedDataRepository";
import { ILearningPathRepository } from "@domain/repositories/ILearningPathRepository";
import { ICourseRepository } from "@domain/repositories/ICourseRepository";
import { ILogger } from "@domain/services/ILogger";
import { IPlatformUrlProvider } from "@domain/services/IPlatformUrlProvider";
import { INamingService } from "@domain/services/INamingService";
import { BrowserProvider } from "@infrastructure/browser/BrowserProvider";
import { setupInterceptor } from "@infrastructure/browser/interceptor";

import { SyncCourse } from "./SyncCourse";

export class SyncLearningPath {
  private browserProvider: BrowserProvider;
  private learningPathRepo: ILearningPathRepository;
  private courseRepo: ICourseRepository;
  private syncCourse: SyncCourse;
  private interceptedDataRepo: IInterceptedDataRepository;
  private urlProvider: IPlatformUrlProvider;
  private namingService: INamingService;
  private logger: ILogger;

  constructor(deps: {
    browserProvider: BrowserProvider,
    learningPathRepo: ILearningPathRepository,
    courseRepo: ICourseRepository,
    syncCourse: SyncCourse,
    interceptedDataRepo: IInterceptedDataRepository,
    urlProvider: IPlatformUrlProvider,
    namingService: INamingService,
    logger: ILogger
  }) {
    this.browserProvider = deps.browserProvider;
    this.learningPathRepo = deps.learningPathRepo;
    this.courseRepo = deps.courseRepo;
    this.syncCourse = deps.syncCourse;
    this.interceptedDataRepo = deps.interceptedDataRepo;
    this.urlProvider = deps.urlProvider;
    this.namingService = deps.namingService;
    this.logger = deps.logger.withContext("SyncLearningPath");
  }

  async execute(target: string): Promise<void> {
    const targetUrl = this.urlProvider.resolveLearningPathUrl(target);
    this.logger.info(`Iniciando mapeo y sincronización de ruta: ${targetUrl}`);

    // 1. Extraer datos (Navegador)
    const context = await this.browserProvider.getAuthenticatedContext();
    const page = await context.newPage();
    setupInterceptor(page);
    
    await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
    
    this.logger.info("Esperando a que el proveedor envíe el listado de courses...");
    await page.waitForTimeout(10000); 
    await page.close();

    // 2. Procesar JSON descargado y Sincronizar Cursos (Base de Datos)
    await this.processInterceptedData();
  }

  private async processInterceptedData(): Promise<void> {
    const payloads = this.interceptedDataRepo.getPendingLearningPaths();
    
    for (const payload of payloads) {
      const json = JSON.parse(payload.content);

      const lpData = json.data?.lpPageData;
      if (!lpData || !lpData.id || !lpData.containerChildren) continue;

      const pathId = lpData.id;
      const pathTitle = lpData.name;
      const pathSlug = this.namingService.slugify(pathTitle);
      const pathDesc = lpData.description || "";

      this.logger.info(`🧭 Procesando Learning Path: ${pathTitle}`);

      this.learningPathRepo.saveLearningPath({ id: pathId, slug: pathSlug, title: pathTitle, description: pathDesc });

      let orderIndex = 1;
      let coursesAdded = 0;

      // Extraer offeringId del URL del payload (ej: .../learning-path/35573/148510/...)
      const offeringId = this.namingService.extractOfferingId(json.url) || undefined;

      for (const child of lpData.containerChildren) {
        if (child.typeId !== "22") continue; // 22 is Standard Course
        if (!child.id || !child.name) continue;

        const courseSlug = this.namingService.slugify(child.name);
        
        this.courseRepo.saveCourse({ id: child.id, slug: courseSlug, title: child.name });
        this.learningPathRepo.addCourseToPath({ pathId: pathId, courseId: child.id, orderIndex });

        // 👉 Aquí está la clave: Sincronizar automáticamente el contenido interno del curso
        this.logger.info(`📥 Sincronizando contenido interno del curso: ${child.name} (${child.id})...`);
        const courseUrl = this.urlProvider.getCourseUrl({ slug: courseSlug, id: child.id });
        
        // Pasamos el offeringId si lo tenemos para ayudar a SyncCourse a ser más preciso
        await this.syncCourse.execute({courseUrl, offeringId});

        orderIndex++;
        coursesAdded++;
      }

      this.logger.info(`✅ Vinculados y sincronizados ${coursesAdded} cursos a la ruta ${pathTitle}.`);
      
      this.interceptedDataRepo.deletePayload(payload.filePath);
    }
  }
}
