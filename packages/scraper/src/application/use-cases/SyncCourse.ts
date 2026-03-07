import { PLATFORM } from "@config/platform";
import { ICourseRepository } from "@domain/repositories/ICourseRepository";
import { IAssetRepository } from "@domain/repositories/IAssetRepository";
import { IInterceptedDataRepository } from "@domain/repositories/IInterceptedDataRepository";
import { ILogger } from "@domain/services/ILogger";
import { IPlatformUrlProvider } from "@domain/services/IPlatformUrlProvider";
import { INamingService } from "@domain/services/INamingService";
import { BrowserProvider } from "@infrastructure/browser/BrowserProvider";
import { setupInterceptor } from "@infrastructure/browser/interceptor";

export class SyncCourse {
  private browserProvider: BrowserProvider;
  private courseRepository: ICourseRepository;
  private assetRepository: IAssetRepository;
  private interceptedDataRepo: IInterceptedDataRepository;
  private urlProvider: IPlatformUrlProvider;
  private namingService: INamingService;
  private logger: ILogger;

  constructor(deps: {
    browserProvider: BrowserProvider,
    courseRepository: ICourseRepository,
    assetRepository: IAssetRepository,
    interceptedDataRepo: IInterceptedDataRepository,
    urlProvider: IPlatformUrlProvider,
    namingService: INamingService,
    logger: ILogger,
  }) {
    this.browserProvider = deps.browserProvider;
    this.courseRepository = deps.courseRepository;
    this.assetRepository = deps.assetRepository;
    this.interceptedDataRepo = deps.interceptedDataRepo;
    this.urlProvider = deps.urlProvider;
    this.namingService = deps.namingService;
    this.logger = deps.logger.withContext("SyncCourse");
  }

  async execute({courseUrl, offeringId}: {courseUrl: string, offeringId?: string}): Promise<void> {
    if (!courseUrl) {
      this.logger.warn("No se proporcionó courseUrl");
      return;
    }

    this.logger.info(`Course Path recibido: "${courseUrl}"`);

    const targetUrl = this.urlProvider.resolveCourseUrl(courseUrl);
    this.logger.info(`Iniciando mapeo y sincronización del curso: ${targetUrl}`);

    const context = await this.browserProvider.getAuthenticatedContext();
    const page = await context.newPage();
    setupInterceptor(page);

    this.logger.info(`Navegando a: ${targetUrl}`);
    await page.goto(targetUrl, { waitUntil: "load", timeout: 60000 });

    if (targetUrl.includes("/course/")) {
      this.logger.info("Click en el tab de Guides para desencadenar json...");
      try {
        await page.waitForSelector(PLATFORM.SELECTORS.COURSE.GUIDES_TAB, { timeout: 15000 });
        await page.click(PLATFORM.SELECTORS.COURSE.GUIDES_TAB);
        this.logger.info("👆 Click en Guides completado. Esperando interceptaciones...");
        await page.waitForTimeout(3000);
      } catch (e) {
        this.logger.warn("No se pudo hacer click en Guides o el tab no existe. Continuando...");
      }
    }

    const intercepted = this.interceptedDataRepo.getPendingCourses();
    let courseData: any = null;
    let selectedPayloadPath: string | null = null;
    
    for (const payload of intercepted) {
        try {
            const wrapper = JSON.parse(payload.content);
            const data = wrapper.data;
            if (!data) continue;

            const matchesSlug = data.slug && targetUrl.includes(data.slug);
            const matchesId = data.id && targetUrl.includes(data.id.toString());

            if (matchesSlug || matchesId) {
                courseData = data;
                selectedPayloadPath = payload.filePath;
                break;
            }
        } catch (e) {
            // Ignorar errores de parseo
        }
    }

    if (courseData) {
      const courseTitle = courseData.name || courseData.title;
      const courseId = courseData.id.toString();
      const courseSlug = courseData.slug || this.namingService.slugify(courseTitle);

      this.logger.info(`💾 Procesando y guardando Curso: ${courseTitle}`);
      
      this.courseRepository.saveCourse({
        id: courseId,
        slug: courseSlug,
        title: courseTitle
      });

      let videoCount = 0;
      let guideCount = 0;

      //0. Extract offeringId from course metadata URL if possible
      let finalOfferingId = offeringId;
      if (!offeringId && selectedPayloadPath) {
        const payload = intercepted.find(p => p.filePath === selectedPayloadPath);
        if (payload) {
          const wrapper = JSON.parse(payload.content);
          const extractedId = this.namingService.extractOfferingId(wrapper.url);
          if (extractedId) {
            finalOfferingId = extractedId;
            this.logger.info(`🔍 Extraído offeringId dinámico: ${finalOfferingId}`);
          }
        }
      }

      // 1. Extraer Guías (eKits)
      if (courseData.eKits && Array.isArray(courseData.eKits)) {
        courseData.eKits.forEach((ekit: any, index: number) => {
          this.assetRepository.saveAsset({
            id: ekit.ekitId,
            courseId: courseId,
            type: 'guide',
            url: "",
            metadata: {
              title: ekit.name,
              order_index: index + 1,
              ekitId: ekit.ekitId,
              offeringId: finalOfferingId
            },
            status: 'PENDING'
          });
          guideCount++;
        });
      }

      // 2. Extraer Vídeos (Modules -> Components)
      if (courseData.modules && Array.isArray(courseData.modules)) {
        let videoOrder = 1;
        courseData.modules.forEach((mod: any) => {
          if (mod.components && Array.isArray(mod.components)) {
            mod.components.forEach((comp: any) => {
              // typeId "1" suele ser lección/vídeo
              if (comp.typeId === PLATFORM.CONSTANTS.ORACLE.VIDEO_TYPE_ID || comp.typeId === parseInt(PLATFORM.CONSTANTS.ORACLE.VIDEO_TYPE_ID)) {
                this.assetRepository.saveAsset({
                  id: comp.id.toString(),
                  courseId: courseId,
                  type: 'video',
                  url: this.urlProvider.getVideoAssetUrl({courseUrl: targetUrl, assetId: comp.id.toString()}),
                  metadata: {
                    title: comp.name,
                    order_index: videoOrder++,
                    duration: comp.duration
                  },
                  status: 'PENDING'
                });
                videoCount++;
              }
            });
          }
        });
      }

      this.logger.info(`✅ Sincronizados ${videoCount} vídeos y ${guideCount} PDFs para "${courseTitle}".`);
      
      if (selectedPayloadPath) {
        this.interceptedDataRepo.deletePayload(selectedPayloadPath);
      }
    } else {
      this.logger.warn("No se encontraron datos interceptados para este curso.");
    }

  }
}
