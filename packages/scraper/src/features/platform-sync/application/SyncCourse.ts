import { type ILogger } from '@core/logging';

import { BrowserInterceptor, type IBrowserProvider } from "@scraper/platform/browser";
import { type IUseCase } from '@scraper/features/shared';
import { type IAssetRepository, type INamingService } from '@scraper/features/asset-download';

import { type ICourseRepository } from '../domain/ports/ICourseRepository';
import { type IInterceptedDataRepositoryFactory } from '../domain/ports/IInterceptedDataRepositoryFactory';
import { type IPlatformUrlProvider } from '../domain/ports/IPlatformUrlProvider';

export interface SyncCourseInput {
  courseInput: string;
  offeringId?: string;
}

type SyncCourseConfig = {
  keepTempWorkspaces: boolean;
  selectors: {
    guidesTab: string;
  };
  oracleConstants: {
    videoTypeId: string | number;
  };
};

export interface SyncCourseOptions {
  browserProvider: IBrowserProvider;
  courseRepository: ICourseRepository;
  assetRepository: IAssetRepository;
  interceptedDataRepoFactory: IInterceptedDataRepositoryFactory;
  browserInterceptor: BrowserInterceptor;
  urlProvider: IPlatformUrlProvider;
  namingService: INamingService;
  logger: ILogger;
  config: SyncCourseConfig;
}

export class SyncCourse implements IUseCase<SyncCourseInput, void> {
  private browserProvider: IBrowserProvider;
  private courseRepository: ICourseRepository;
  private assetRepository: IAssetRepository;
  private interceptedDataRepoFactory: IInterceptedDataRepositoryFactory;
  private browserInterceptor: BrowserInterceptor;
  private urlProvider: IPlatformUrlProvider;
  private namingService: INamingService;
  private logger: ILogger;
  private config: any;

  constructor(options: SyncCourseOptions) {
    this.browserProvider = options.browserProvider;
    this.courseRepository = options.courseRepository;
    this.assetRepository = options.assetRepository;
    this.interceptedDataRepoFactory = options.interceptedDataRepoFactory;
    this.browserInterceptor = options.browserInterceptor;
    this.urlProvider = options.urlProvider;
    this.namingService = options.namingService;
    this.logger = options.logger.withContext('SyncCourse');
    this.config = options.config;
  }

  async execute(input: SyncCourseInput): Promise<void> {
    const { courseInput, offeringId } = input;

    if (!courseInput) {
      this.logger.error("No se proporcionó courseUrl o IDs.");
      return;
    }

    const { url, courseId } = this.urlProvider.resolveCourseUrl(courseInput);

    if (!courseId) {
      this.logger.error(`No se pudo resolver el ID del curso para: ${courseInput}`);
      return;
    }

    this.logger.info(`🚀 Iniciando sincronización del curso: ${courseId} (${url})`);

    const browser = await this.browserProvider.getAuthenticatedContext();
    const page = await browser.newPage();

    const isolatedDirPath = await this.browserInterceptor.setup(page, { prefix: 'course', execTimestamp: Date.now() });
    const isolatedInterceptedDataRepo = this.interceptedDataRepoFactory.create(isolatedDirPath);

    try {
      this.logger.info("Navegando al curso para esperar interceptaciones...");
      await page.goto(url, { waitUntil: 'load', timeout: 60000 });

      try {
        await page.waitForSelector(this.config.selectors.guidesTab, { timeout: 30000 });
        await page.click(this.config.selectors.guidesTab);
        this.logger.info("Click en pestaña de Guías.");
      } catch (e) {
        this.logger.warn("No se pudo hacer click en Guides, procediendo igualmente.");
      }

      await page.waitForTimeout(5000);

      this.logger.info("Leyendo datos interceptados...");
      const intercepted = await isolatedInterceptedDataRepo.getPendingForCourse(courseId);

      if (intercepted.length > 0) {
        let courseTitle: string | null = null;
        let courseSlug: string | null = null;
        let finalOfferingId = offeringId || null;

        const ekitsMap = new Map<string, any>();
        const videosMap = new Map<string, any>();
        const processedPayloadPaths: string[] = [];

        for (const wrapper of intercepted) {
          processedPayloadPaths.push(wrapper.filePath);

          let raw: any;
          try {
            raw = JSON.parse(wrapper.content);
          } catch (e) {
            this.logger.warn(`Error parseando payload en ${wrapper.filePath}: ${e}`);
            continue;
          }

          const data = raw.data;
          const wrapperUrl = raw.url || "";
          if (!data) continue;

          if (data.name || data.title) {
            const t = data.name || data.title;
            const currentLen = courseTitle?.length || 0;
            if (t.length > currentLen) {
              courseTitle = t;
            }
          }
          if (data.slug) courseSlug = data.slug;

          if (!finalOfferingId) {
            const extractedId = this.namingService.extractOfferingId(wrapperUrl);
            if (extractedId) {
              finalOfferingId = extractedId;
              this.logger.info(`🔍 Extraído offeringId dinámico: ${finalOfferingId}`);
            }
          }

          if (data.eKits && Array.isArray(data.eKits)) {
            data.eKits.forEach((ekit: any) => {
              const numericId = ekit.id?.toString();
              const uuid = ekit.ekitId;

              if (!numericId && !uuid) return;

              let existing = null;
              if (numericId && ekitsMap.has(`num_${numericId}`)) {
                existing = ekitsMap.get(`num_${numericId}`);
              } else if (uuid && ekitsMap.has(`uuid_${uuid}`)) {
                existing = ekitsMap.get(`uuid_${uuid}`);
              }

              if (!existing) {
                existing = { id: numericId, ekitId: uuid };
                if (numericId) ekitsMap.set(`num_${numericId}`, existing);
                if (uuid) ekitsMap.set(`uuid_${uuid}`, existing);
              } else {
                if (numericId && !existing.id) {
                  existing.id = numericId;
                  ekitsMap.set(`num_${numericId}`, existing);
                }
                if (uuid && !existing.ekitId) {
                  existing.ekitId = uuid;
                  ekitsMap.set(`uuid_${uuid}`, existing);
                }
              }

              if (ekit.name) existing.name = ekit.name;
              if (ekit.gcc) existing.gcc = ekit.gcc;
              if (ekit.ekitType) existing.ekitType = ekit.ekitType;
              if (ekit.typeId) existing.typeId = ekit.typeId;
              if (ekit.offeringId) existing.offeringId = ekit.offeringId;
            });
          }

          if (data.modules && Array.isArray(data.modules)) {
            data.modules.forEach((mod: any) => {
              if (mod.components && Array.isArray(mod.components)) {
                mod.components.forEach((comp: any) => {
                  const videoTypeId = this.config.oracleConstants.videoTypeId;
                  if (String(comp.typeId) === String(videoTypeId)) {
                    const vidId = (comp.id || comp.uuid)?.toString();
                    if (!vidId) return;

                    if (!videosMap.has(vidId)) {
                      videosMap.set(vidId, {
                        id: vidId,
                        name: comp.name || comp.title,
                        duration: comp.duration
                      });
                    } else {
                      const existing = videosMap.get(vidId);
                      const newName = comp.name || comp.title;
                      if (!existing.name && newName) {
                        existing.name = newName;
                      }
                      if (!existing.duration && comp.duration) {
                        existing.duration = comp.duration;
                      }
                    }
                  }
                });
              }
            });
          }
        }

        const existingCourse = await this.courseRepository.getCourseById(courseId);
        await this.courseRepository.saveCourse({
          id: courseId,
          title: courseTitle || existingCourse?.title || "Unknown Course",
          slug: courseSlug || existingCourse?.slug || this.namingService.slugify(courseTitle || ""),
        });

        const uniqueEkits = Array.from(new Set(ekitsMap.values()));
        uniqueEkits.forEach((ekit, index) => {
          this.assetRepository.saveAsset({
            id: ekit.id,
            courseId: courseId,
            type: 'guide',
            url: "",
            metadata: {
              name: ekit.name || `Guide ${index + 1}`,
              id: ekit.id,
              ekitId: ekit.ekitId,
              typeId: ekit.typeId,
              ekitType: ekit.ekitType,
              gcc: ekit.gcc,
              offeringId: ekit.offeringId || finalOfferingId,
              order_index: index + 1,
            },
            status: 'PENDING'
          });
        });

        Array.from(videosMap.values()).forEach((video, index) => {
          this.assetRepository.saveAsset({
            id: video.id,
            courseId: courseId,
            type: 'video',
            url: this.urlProvider.getVideoAssetUrl({ courseUrl: url, assetId: video.id }),
            metadata: {
              name: video.name || `Video ${index + 1}`,
              order_index: index + 1,
              duration: video.duration
            },
            status: 'PENDING'
          });
        });

        this.logger.info(`✅ Sincronizados ${videosMap.size} vídeos y ${uniqueEkits.length} PDFs para "${courseTitle}".`);

        for (const p of processedPayloadPaths) {
          await isolatedInterceptedDataRepo.markAsProcessed(p);
        }

      } else {
        this.logger.warn("No se encontraron datos interceptados válidos para este curso.");
      }

    } finally {
      if (isolatedDirPath && !this.config.keepTempWorkspaces) {
        await isolatedInterceptedDataRepo.deleteWorkspace();
      } else if (isolatedDirPath) {
        this.logger.info(`[OFFLINE] Manteniendo espacio de trabajo interceptado: ${isolatedDirPath}`);
      }
    }
  }
}
