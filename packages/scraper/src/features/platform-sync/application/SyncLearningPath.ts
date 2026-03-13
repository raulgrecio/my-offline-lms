import { env } from "@config/env";
import { IInterceptedDataRepositoryFactory } from "@features/platform-sync/domain/ports/IInterceptedDataRepositoryFactory";
import { ILearningPathRepository } from "@features/platform-sync/domain/ports/ILearningPathRepository";
import { ICourseRepository } from "@features/platform-sync/domain/ports/ICourseRepository";
import { ILogger } from "@platform/logging/ILogger";
import { IPlatformUrlProvider } from "@features/platform-sync/domain/ports/IPlatformUrlProvider";
import { INamingService } from "@features/asset-download/domain/ports/INamingService";
import { BrowserProvider } from "@platform/browser/BrowserProvider";
import { setupInterceptor } from "@platform/browser/interceptor";

import { SyncCourse } from "./SyncCourse";

export class SyncLearningPath {
  private browserProvider: BrowserProvider;
  private learningPathRepo: ILearningPathRepository;
  private courseRepo: ICourseRepository;
  private syncCourse: SyncCourse;
  private interceptedDataRepoFactory: IInterceptedDataRepositoryFactory;
  private urlProvider: IPlatformUrlProvider;
  private namingService: INamingService;
  private logger: ILogger;

  constructor(deps: {
    browserProvider: BrowserProvider,
    learningPathRepo: ILearningPathRepository,
    courseRepo: ICourseRepository,
    syncCourse: SyncCourse,
    interceptedDataRepoFactory: IInterceptedDataRepositoryFactory,
    urlProvider: IPlatformUrlProvider,
    namingService: INamingService,
    logger: ILogger
  }) {
    this.browserProvider = deps.browserProvider;
    this.learningPathRepo = deps.learningPathRepo;
    this.courseRepo = deps.courseRepo;
    this.syncCourse = deps.syncCourse;
    this.interceptedDataRepoFactory = deps.interceptedDataRepoFactory;
    this.urlProvider = deps.urlProvider;
    this.namingService = deps.namingService;
    this.logger = deps.logger.withContext("SyncLearningPath");
  }

  async execute(pathInput: string): Promise<void> {
    if (!pathInput) {
      this.logger.error("No se proporcionó pathInput");
      return;
    }
    const { url, pathId } = this.urlProvider.resolveLearningPathUrl(pathInput);

    if (!url || !pathId) {
      this.logger.error(`No se pudo resolver la URL o el ID del path: ${pathInput}`);
      return;
    }
 
    this.logger.info(`Iniciando mapeo y sincronización de ruta: ${url} (ID: ${pathId})`);

    // 1. Extraer datos (Navegador)
    const context = await this.browserProvider.getAuthenticatedContext();
    const page = await context.newPage();
    
    // Create an isolated repository for this specific execution
    // (We will initialize the actual path when setupInterceptor returns it)
    const isolatedDirPath = setupInterceptor(page, { prefix: 'path', execTimestamp: Date.now() });
    const isolatedInterceptedDataRepo = this.interceptedDataRepoFactory.create(isolatedDirPath);
    
    this.logger.info(`Carpeta de trabajo temporal: ${isolatedDirPath}`);
    
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    
    this.logger.info("Esperando a que el proveedor envíe el listado de courses...");
    await page.waitForTimeout(10000); 
    await page.close();

    // 2. Procesar JSON descargado y Sincronizar Cursos (Base de Datos)
    await this.processInterceptedData({ pathId, isolatedInterceptedDataRepo });

    // --- Isolated Execution Environment Cleanup ---
    if (!env.KEEP_TEMP_WORKSPACES) {
      if (isolatedDirPath) {
        this.logger.info(`🧹 Limpiando espacio de trabajo temporal del path: ${isolatedDirPath}`);
        isolatedInterceptedDataRepo.deleteWorkspace();
      }
    } else {
      if (isolatedDirPath) {
        this.logger.info(`💾 Manteniendo espacio de trabajo temporal por configuración: ${isolatedDirPath}`);
      }
    }
  }

  private async processInterceptedData({ pathId, isolatedInterceptedDataRepo }: { pathId: string, isolatedInterceptedDataRepo: ReturnType<IInterceptedDataRepositoryFactory['create']> }): Promise<void> {
    const intercepted = isolatedInterceptedDataRepo.getPendingForLearningPath(pathId);
    
    for (const payload of intercepted) {
      const json = JSON.parse(payload.content);

      const lpData = json.data?.lpPageData;
      if (!lpData || !lpData.id || !lpData.containerChildren) continue;

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
        
        // Pre-guardamos el curso primero, para asegurarnos que en cualquier caso quede asociado al learning path
        this.courseRepo.saveCourse({ id: child.id, slug: courseSlug, title: child.name });
        this.learningPathRepo.addCourseToPath({ pathId: pathId, courseId: child.id, orderIndex });

        // 👉 Aquí está la clave: Sincronizar automáticamente el contenido interno del curso
        this.logger.info(`📥 Sincronizando contenido interno del curso: ${child.name} (${child.id})...`);
        const courseUrl = this.urlProvider.getCourseUrl({ slug: courseSlug, id: child.id });
        
        // Pasamos el offeringId si lo tenemos para ayudar a SyncCourse a ser más preciso
        await this.syncCourse.execute({courseInput: courseUrl, offeringId});

        orderIndex++;
        coursesAdded++;
      }

      this.logger.info(`✅ Vinculados y sincronizados ${coursesAdded} cursos a la ruta ${pathTitle}.`);
      
      isolatedInterceptedDataRepo.markAsProcessed(payload.filePath);
    }
  }
}
