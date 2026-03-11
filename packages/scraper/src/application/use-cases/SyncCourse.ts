import { env } from "@config/env";
import { PLATFORM } from "@config/platform";
import { ICourseRepository } from "@domain/repositories/ICourseRepository";
import { IAssetRepository } from "@domain/repositories/IAssetRepository";
import { IInterceptedDataRepositoryFactory } from "@domain/repositories/IInterceptedDataRepositoryFactory";
import { ILogger } from "@domain/services/ILogger";
import { IPlatformUrlProvider } from "@domain/services/IPlatformUrlProvider";
import { INamingService } from "@domain/services/INamingService";
import { BrowserProvider } from "@infrastructure/browser/BrowserProvider";
import { setupInterceptor } from "@infrastructure/browser/interceptor";

export class SyncCourse {
  private browserProvider: BrowserProvider;
  private courseRepository: ICourseRepository;
  private assetRepository: IAssetRepository;
  private interceptedDataRepoFactory: IInterceptedDataRepositoryFactory;
  private urlProvider: IPlatformUrlProvider;
  private namingService: INamingService;
  private logger: ILogger;

  constructor(deps: {
    browserProvider: BrowserProvider,
    courseRepository: ICourseRepository,
    assetRepository: IAssetRepository,
    interceptedDataRepoFactory: IInterceptedDataRepositoryFactory,
    urlProvider: IPlatformUrlProvider,
    namingService: INamingService,
    logger: ILogger,
  }) {
    this.browserProvider = deps.browserProvider;
    this.courseRepository = deps.courseRepository;
    this.assetRepository = deps.assetRepository;
    this.interceptedDataRepoFactory = deps.interceptedDataRepoFactory;
    this.urlProvider = deps.urlProvider;
    this.namingService = deps.namingService;
    this.logger = deps.logger.withContext("SyncCourse");
  }

  async execute({courseInput, offeringId}: {courseInput: string, offeringId?: string}): Promise<void> {
    if (!courseInput) {
      this.logger.error("No se proporcionó courseUrl");
      return;
    }

    this.logger.info(`Course Path recibido: "${courseInput}"`);

    const { url, courseId } = this.urlProvider.resolveCourseUrl(courseInput);

    if (!url || !courseId) {
      this.logger.error(`No se pudo resolver la URL o el ID del curso: ${courseInput}`);
      return;
    }
   
    this.logger.info(`Iniciando mapeo y sincronización del curso: ${url} (ID: ${courseId})`);
    
    const context = await this.browserProvider.getAuthenticatedContext();
    const page = await context.newPage();
    
    // Create an isolated repository for this specific execution
    // (We will initialize the actual path when setupInterceptor returns it)
    const isolatedDirPath = setupInterceptor(page, { prefix: "course", execTimestamp: Date.now() });
    this.logger.info(`Carpeta de trabajo temporal: ${isolatedDirPath}`);

    const isolatedInterceptedDataRepo = this.interceptedDataRepoFactory.create(isolatedDirPath);

    this.logger.info(`Navegando a: ${url}`);
    await page.goto(url, { waitUntil: "load", timeout: 60000 });

    this.logger.info("Click en el tab de Guides para desencadenar json...");
    try {
      await page.waitForSelector(PLATFORM.SELECTORS.COURSE.GUIDES_TAB, { timeout: 15000 });
      await page.click(PLATFORM.SELECTORS.COURSE.GUIDES_TAB);
      this.logger.info("👆 Click en Guides completado. Esperando interceptaciones (7s)...");
      await page.waitForTimeout(7000);
    } catch (e) {
      this.logger.warn("No se pudo hacer click en Guides o el tab no existe. Continuando...");
    }

    const intercepted = isolatedInterceptedDataRepo.getPendingForCourse(courseId);
    const matchingPayloads: any[] = [];
    const processedPayloadPaths: string[] = [];
    
    // 1. Identificar todos los payloads que corresponden a este curso
    for (const payload of intercepted) {
        try {
            const wrapper = JSON.parse(payload.content);
            const data = wrapper.data;
            if (!data) continue;

            const matchesSlug = data.slug && url.includes(data.slug);
            const matchesId = data.id && url.includes(data.id.toString());

            if (matchesSlug || matchesId) {
                matchingPayloads.push(wrapper);
                processedPayloadPaths.push(payload.filePath);
            }
        } catch (e) {
            this.logger.warn(`Error parseando payload: ${payload.filePath}`);
        }
    }

    if (matchingPayloads.length > 0) {
      // 2. Fusionar datos básicos del curso
      const firstData = matchingPayloads[0].data;
      const courseId = firstData.id.toString();
      let courseTitle = firstData.name || firstData.title;
      
      // Buscar el mejor título disponible en todos los payloads
      for (const p of matchingPayloads) {
          const t = p.data.name || p.data.title;
          if (t && t.length > (courseTitle?.length || 0)) {
              courseTitle = t;
          }
      }

      this.logger.info(`💾 Fusionando metadatos para Curso: ${courseTitle} (${courseId})`);
      
      const courseSlug = firstData.slug || this.namingService.slugify(courseTitle);
      this.courseRepository.saveCourse({
        id: courseId,
        slug: courseSlug,
        title: courseTitle
      });

      // Mapas para almacenar assets fusionados
      const ekitsMap = new Map<string, any>();
      const videosMap = new Map<string, any>();
      let finalOfferingId = offeringId;

      // 3. Iterar por todos los payloads para fusionar assets
      for (const wrapper of matchingPayloads) {
          const data = wrapper.data;
          
          // Extraer offeringId de la URL del payload si no lo tenemos
          if (!finalOfferingId) {
              const extractedId = this.namingService.extractOfferingId(wrapper.url);
              if (extractedId) {
                  finalOfferingId = extractedId;
                  this.logger.info(`🔍 Extraído offeringId dinámico: ${finalOfferingId}`);
              }
          }

          // A. Fusionar eKits (Guías)
          if (data.eKits && Array.isArray(data.eKits)) {
              data.eKits.forEach((ekit: any) => {
                  const numericId = ekit.id?.toString();
                  const uuid = ekit.ekitId;
                  
                  if (!numericId && !uuid) return;

                  // Buscar si ya existe por cualquiera de los dos IDs
                  let existing = null;
                  if (numericId && ekitsMap.has(`num_${numericId}`)) {
                      existing = ekitsMap.get(`num_${numericId}`);
                  } else if (uuid && ekitsMap.has(`uuid_${uuid}`)) {
                      existing = ekitsMap.get(`uuid_${uuid}`);
                  }

                  if (!existing) {
                      existing = { id: numericId, ekitId: uuid };
                      // Registrar en ambos mapas si están presentes
                      if (numericId) ekitsMap.set(`num_${numericId}`, existing);
                      if (uuid) ekitsMap.set(`uuid_${uuid}`, existing);
                  } else {
                      // Si ya existía, pero ahora tenemos el otro ID, actualizar mapas
                      if (numericId && !existing.id) {
                          existing.id = numericId;
                          ekitsMap.set(`num_${numericId}`, existing);
                      }
                      if (uuid && !existing.ekitId) {
                          existing.ekitId = uuid;
                          ekitsMap.set(`uuid_${uuid}`, existing);
                      }
                  }
                  
                  // Fusionar campos (solo si el nuevo tiene valor valioso)
                  if (ekit.name) existing.name = ekit.name;
                  if (ekit.gcc) existing.gcc = ekit.gcc;
                  if (ekit.ekitType) existing.ekitType = ekit.ekitType;
                  if (ekit.typeId) existing.typeId = ekit.typeId;
                  if (ekit.offeringId) existing.offeringId = ekit.offeringId;
              });
          }

          // B. Fusionar Vídeos (Modules -> Components)
          if (data.modules && Array.isArray(data.modules)) {
            data.modules.forEach((mod: any) => {
              if (mod.components && Array.isArray(mod.components)) {
                mod.components.forEach((comp: any) => {
                  if (comp.typeId === PLATFORM.CONSTANTS.ORACLE.VIDEO_TYPE_ID || comp.typeId === parseInt(PLATFORM.CONSTANTS.ORACLE.VIDEO_TYPE_ID)) {
                    const vidId = comp.id.toString();
                    if (!videosMap.has(vidId)) {
                        videosMap.set(vidId, {
                            id: vidId,
                            name: comp.name || comp.title,
                            duration: comp.duration
                        });
                    } else {
                        const existing = videosMap.get(vidId);
                        if (!existing.name && (comp.name || comp.title)) existing.name = comp.name || comp.title;
                        if (!existing.duration && comp.duration) existing.duration = comp.duration;
                    }
                  }
                });
              }
            });
          }
      }

      // 4. Guardar assets fusionados en la DB
      let guideCount = 0;
      let videoCount = 0;

      // Obtener lista única de eKits (un Mapa puede tener el mismo objeto bajo 'num_' y 'uuid_')
      const uniqueEkits = Array.from(new Set(ekitsMap.values()));

      // Guardar Guías
      uniqueEkits.forEach((ekit, index) => {
          // El usuario prefiere el ID numérico como PK en Course_Assets.
          // El UUID (ekitId) se guarda en metadatos para el visor.
          const assetId = ekit.id; 
          
          this.assetRepository.saveAsset({
            id: assetId,
            courseId: courseId,
            type: 'guide',
            url: "",
            metadata: {
              name: ekit.name || `Guide ${index + 1}`,
              id: ekit.id, // numeric id
              ekitId: ekit.ekitId, // UUID (ahora explícitamente en meta)
              typeId: ekit.typeId,
              ekitType: ekit.ekitType,
              gcc: ekit.gcc,
              offeringId: ekit.offeringId || finalOfferingId,
              order_index: index + 1,
            },
            status: 'PENDING'
          });
          guideCount++;
      });

      // Guardar Vídeos
      Array.from(videosMap.values()).forEach((video, index) => {
        this.assetRepository.saveAsset({
          id: video.id,
          courseId: courseId,
          type: 'video',
          url: this.urlProvider.getVideoAssetUrl({courseUrl: url, assetId: video.id}),
          metadata: {
            name: video.name || `Video ${index + 1}`,
            order_index: index + 1,
            duration: video.duration
          },
          status: 'PENDING'
        });
        videoCount++;
      });

      this.logger.info(`✅ Sincronizados ${videoCount} vídeos y ${guideCount} PDFs para "${courseTitle}".`);

      // 5. Marcar todos los archivos interceptados del curso como procesados
      processedPayloadPaths.forEach(p => isolatedInterceptedDataRepo.markAsProcessed(p));

    } else {
      this.logger.warn("No se encontraron datos interceptados válidos para este curso.");
    }

    // --- Isolated Execution Environment Cleanup ---
    if (!env.KEEP_TEMP_WORKSPACES) {
      if (isolatedDirPath) {
        this.logger.info(`🧹 Limpiando espacio de trabajo temporal del curso: ${isolatedDirPath}`);
        isolatedInterceptedDataRepo.deleteWorkspace();
      }
    } else {
      if (isolatedDirPath) {
        this.logger.info(`💾 Manteniendo espacio de trabajo temporal por configuración: ${isolatedDirPath}`);
      }
    }
  }
}
