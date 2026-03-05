import { BrowserProvider } from "../../infrastructure/browser/BrowserProvider";
import { ICourseRepository } from "../../domain/repositories/ICourseRepository";
import { IAssetRepository } from "../../domain/repositories/IAssetRepository";
import { IInterceptedDataRepository } from "../../domain/repositories/IInterceptedDataRepository";
import { env } from "../../config/env";
import { ILogger } from "../../domain/services/ILogger";
import { setupInterceptor } from "../../infrastructure/browser/interceptor";
import { Slug } from "../../domain/value-objects/Slug";

export class SyncCourseData {
  private browserProvider: BrowserProvider;
  private courseRepository: ICourseRepository;
  private assetRepository: IAssetRepository;
  private interceptedDataRepo: IInterceptedDataRepository;
  private logger: ILogger;

  constructor(deps: {
    browserProvider: BrowserProvider,
    courseRepository: ICourseRepository,
    assetRepository: IAssetRepository,
    interceptedDataRepo: IInterceptedDataRepository,
    logger: ILogger
  }) {
    this.browserProvider = deps.browserProvider;
    this.courseRepository = deps.courseRepository;
    this.assetRepository = deps.assetRepository;
    this.interceptedDataRepo = deps.interceptedDataRepo;
    this.logger = deps.logger.withContext("SyncCourseData");
  }

  async execute(coursePath: string): Promise<void> {
    if (!coursePath) {
      this.logger.warn("No se proporcionó coursePath");
      return;
    }

    this.logger.info(`Course Path recibido: "${coursePath}"`);

    const targetUrl = this.resolveCourseUrl(coursePath);
    this.logger.info(`Iniciando mapeo y sincronización del curso: ${targetUrl}`);

    const context = await this.browserProvider.getAuthenticatedContext();
    const page = await context.newPage();
    setupInterceptor(page);

    this.logger.info(`Navegando a: ${targetUrl}`);
    await page.goto(targetUrl, { waitUntil: "load", timeout: 60000 });

    if (targetUrl.includes("/course/")) {
      this.logger.info("Click en el tab de Guides para desencadenar json...");
      try {
        await page.waitForSelector("#guides-tab", { timeout: 15000 });
        await page.click("#guides-tab");
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
      const courseSlug = courseData.slug || Slug.create(courseTitle).getValue();

      this.logger.info(`💾 Procesando y guardando Curso: ${courseTitle}`);
      
      this.courseRepository.saveCourse({
        id: courseId,
        slug: courseSlug,
        title: courseTitle
      });

      let videoCount = 0;
      let guideCount = 0;

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
              ekitId: ekit.ekitId
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
              if (comp.typeId === "1" || comp.typeId === 1) {
                this.assetRepository.saveAsset({
                  id: comp.id.toString(),
                  courseId: courseId,
                  type: 'video',
                  url: `${targetUrl}${comp.id}`,
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

    await this.browserProvider.close();
  }

  private resolveCourseUrl(target: string): string {
    let url = target;
    if (!target.startsWith("http")) {
      const baseUrl = env.PLATFORM_BASE_URL;
      url = new URL(`/ou/course/slug/${target}`, baseUrl).href;
    }
    return url.endsWith('/') ? url : `${url}/`;
  }
}
