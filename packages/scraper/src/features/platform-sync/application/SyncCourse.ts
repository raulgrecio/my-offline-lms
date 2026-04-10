import { type Page, type BrowserContext } from 'playwright';

import { type ILogger } from '@core/logging';

import { BrowserInterceptor, type IBrowserProvider } from "@scraper/platform/browser";
import { type IUseCase } from '@scraper/features/shared';
import { type IAssetRepository, type INamingService } from '@scraper/features/asset-download';
import { AbortContext } from '@scraper/features/task-management';

import { type ICourseRepository } from '../domain/ports/ICourseRepository';
import {
  type IInterceptedDataRepository,
  type InterceptedRepoCreator
} from '../domain/ports/IInterceptedDataRepository';
import { type IPlatformUrlProvider } from '../domain/ports/IPlatformUrlProvider';

/* -------------------------------------------------------------------------- */
/*                                    TYPES                                   */
/* -------------------------------------------------------------------------- */

export interface SyncCourseInput {
  courseInput: string;
  offeringId?: string;
  taskId?: string;
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
  createInterceptedRepo: InterceptedRepoCreator;
  browserInterceptor: BrowserInterceptor;
  urlProvider: IPlatformUrlProvider;
  namingService: INamingService;
  logger: ILogger;
  config: SyncCourseConfig;
}

/* -------------------------------------------------------------------------- */

type InterceptedPayload = {
  filePath: string;
  content: string;
};

type ParsedPayload = {
  data: any;
  url: string;
};

type CourseMetadata = {
  title: string | null;
  slug: string | null;
  offeringId: string | null;
};

type EkitAsset = {
  id?: string;
  ekitId?: string;
  name?: string;
  gcc?: string;
  ekitType?: string;
  typeId?: string;
  offeringId?: string;
};

type VideoAsset = {
  id: string;
  name?: string;
  duration?: number;
};

/* -------------------------------------------------------------------------- */
/*                                  USE CASE                                  */
/* -------------------------------------------------------------------------- */

export class SyncCourse implements IUseCase<SyncCourseInput, void> {
  private browserProvider: IBrowserProvider;
  private courseRepository: ICourseRepository;
  private assetRepository: IAssetRepository;
  private createInterceptedRepo: InterceptedRepoCreator;
  private browserInterceptor: BrowserInterceptor;
  private urlProvider: IPlatformUrlProvider;
  private namingService: INamingService;
  private logger: ILogger;
  private config: SyncCourseConfig;

  constructor(options: SyncCourseOptions) {
    this.browserProvider = options.browserProvider;
    this.courseRepository = options.courseRepository;
    this.assetRepository = options.assetRepository;
    this.createInterceptedRepo = options.createInterceptedRepo;
    this.browserInterceptor = options.browserInterceptor;
    this.urlProvider = options.urlProvider;
    this.namingService = options.namingService;
    this.logger = options.logger.withContext("SyncCourse");
    this.config = options.config;
  }

  /* -------------------------------------------------------------------------- */
  /*                                   EXECUTE                                  */
  /* -------------------------------------------------------------------------- */

  async execute(input: SyncCourseInput): Promise<void> {
    AbortContext.throwIfAborted();

    if (!input.courseInput) {
      this.logger.error("No se proporcionó courseUrl o IDs.");
      return;
    }

    const { url, courseId } = this.resolveCourse(input.courseInput);

    if (!courseId) {
      this.logger.error(`No se pudo resolver el ID del curso para: ${input.courseInput}`);
      return;
    }

    this.logger.info(`🚀 Iniciando sincronización del curso: ${courseId}`);

    const { context, page } = await this.openBrowserContext();

    const { isolatedDirPath, interceptedRepo } = await this.setupInterceptorWorkspace(page);

    try {
      await this.navigateToCourse(page, url);

      const intercepted = await this.readInterceptedPayloads(interceptedRepo, courseId);

      if (intercepted.length === 0) {
        this.logger.warn("No se encontraron datos interceptados.");
        return;
      }

      const parsed = this.parseAllPayloads(intercepted);
      const metadata = this.extractCourseMetadata(parsed, input.offeringId);
      const ekits = this.aggregateEkits(parsed);
      const videos = this.aggregateVideos(parsed);

      await this.persistCourse(courseId, metadata);
      await this.persistEkits(courseId, ekits, metadata.offeringId);
      await this.persistVideos(courseId, videos, url);
      await this.markPayloadsAsProcessed(interceptedRepo, intercepted);

      this.logger.info(`✅ Sincronizados ${videos.length} vídeos y ${ekits.length} PDFs`);
    } finally {
      await this.browserProvider.closeContext(context);
      await this.cleanupWorkspace(interceptedRepo, isolatedDirPath);
    }
  }

  /* -------------------------------------------------------------------------- */
  /*                                PURE LOGIC                                  */
  /* -------------------------------------------------------------------------- */

  private resolveCourse(courseInput: string) {
    return this.urlProvider.resolveCourseUrl(courseInput);
  }

  private parsePayload(wrapper: InterceptedPayload): ParsedPayload | null {
    try {
      const raw = JSON.parse(wrapper.content);
      if (!raw?.data) return null;

      return {
        data: raw.data,
        url: raw.url ?? "",
      };
    } catch {
      this.logger.warn(`Error parseando payload en ${wrapper.filePath}`);
      return null;
    }
  }

  private parseAllPayloads(intercepted: InterceptedPayload[]): ParsedPayload[] {
    return intercepted
      .map((p) => this.parsePayload(p))
      .filter((p): p is ParsedPayload => p !== null);
  }

  private extractCourseMetadata(payloads: ParsedPayload[], existingOfferingId?: string): CourseMetadata {
    let title: string | null = null;
    let slug: string | null = null;
    let offeringId = existingOfferingId ?? null;

    for (const p of payloads) {
      const data = p.data;

      if (data.name || data.title) {
        const candidate = data.name || data.title;

        if (!title || candidate.length > title.length) {
          title = candidate;
        }
      }

      if (data.slug) slug = data.slug;

      if (!offeringId) {
        const extracted = this.namingService.extractOfferingId(p.url);
        if (extracted) {
          offeringId = extracted;
          this.logger.info(`🔍 Extraído offeringId dinámico: ${offeringId}`);
        }
      }
    }

    return { title, slug, offeringId };
  }

  private aggregateEkits(
    payloads: ParsedPayload[],
  ): EkitAsset[] {
    const map = new Map<string, EkitAsset>();

    for (const p of payloads) {
      const ekits = p.data.eKits;

      if (!Array.isArray(ekits)) continue;

      for (const ekit of ekits) {
        const id = ekit.id?.toString();
        const uuid = ekit.ekitId;

        if (!id && !uuid) continue;

        const key = id ? `num_${id}` : `uuid_${uuid}`;
        map.set(key, { ...map.get(key), ...ekit });
      }
    }

    return Array.from(map.values());
  }

  private aggregateVideos(payloads: ParsedPayload[]): VideoAsset[] {
    const map = new Map<string, VideoAsset>();
    const videoTypeId = String(this.config.oracleConstants.videoTypeId);

    for (const p of payloads) {
      const modules = p.data.modules;

      if (!Array.isArray(modules)) continue;

      for (const mod of modules) {
        for (const comp of mod.components ?? []) {
          if (String(comp.typeId) !== videoTypeId) continue;

          const id = (comp.id || comp.uuid)?.toString();
          if (!id) continue;

          const existing = map.get(id);
          map.set(id, {
            id,
            name: comp.name || comp.title || existing?.name,
            duration: comp.duration || existing?.duration,
          });
        }
      }
    }

    return Array.from(
      map.values(),
    );
  }

  /* -------------------------------------------------------------------------- */
  /*                                  IO OPS                                    */
  /* -------------------------------------------------------------------------- */

  private async openBrowserContext(): Promise<{
    context: BrowserContext;
    page: Page;
  }> {
    AbortContext.throwIfAborted();

    const context = await this.browserProvider.getAuthenticatedContext();
    const page = await context.newPage();

    return { context, page };
  }

  private async setupInterceptorWorkspace(page: Page): Promise<{
    isolatedDirPath: string;
    interceptedRepo: IInterceptedDataRepository;
  }> {
    AbortContext.throwIfAborted();

    const dir =
      await this.browserInterceptor.setup(page, {
        prefix: "course",
        execTimestamp: Date.now(),
      });

    return {
      isolatedDirPath: dir,
      interceptedRepo: this.createInterceptedRepo(dir),
    };
  }

  private async navigateToCourse(
    page: Page,
    url: string,
  ): Promise<void> {
    AbortContext.throwIfAborted();

    await page.goto(url, { waitUntil: "load", timeout: 60000 });

    try {
      await page.waitForSelector(this.config.selectors.guidesTab, { timeout: 30000 });

      await page.click(this.config.selectors.guidesTab);
    } catch {
      this.logger.warn("No se pudo hacer click en Guides.");
    }

    await page.waitForTimeout(5000);
  }

  private async readInterceptedPayloads(
    repo: IInterceptedDataRepository,
    courseId: string,
  ): Promise<InterceptedPayload[]> {
    AbortContext.throwIfAborted();

    return repo.getPendingForCourse(
      courseId,
    );
  }

  private async persistCourse(
    courseId: string,
    metadata: CourseMetadata,
  ): Promise<void> {
    AbortContext.throwIfAborted();

    const existing = await this.courseRepository.getCourseById(courseId);

    await this.courseRepository.saveCourse({
      id: courseId,
      title: metadata.title || existing?.title || "Unknown Course",
      slug: metadata.slug || existing?.slug || this.namingService.slugify(metadata.title ?? ""),
    });
  }

  private async persistEkits(
    courseId: string,
    ekits: EkitAsset[],
    offeringId: string | null,
  ): Promise<void> {
    AbortContext.throwIfAborted();

    await Promise.all(
      ekits.map((ekit, index) =>
        this.assetRepository.saveAsset({
          id: ekit.id || ekit.ekitId || `guide-${index}`,
          courseId,
          type: "guide",
          url: "",
          metadata: {
            ...ekit,
            id: ekit.id || ekit.ekitId || `guide-${index}`,
            ekitId: ekit.ekitId || ekit.id || `unknown-ekit-${index}`,
            name: ekit.name || `Guide ${index + 1}`,
            offeringId: ekit.offeringId || offeringId || undefined,
            order_index: index + 1,
          },
          status: "PENDING",
        }),
      ),
    );
  }

  private async persistVideos(
    courseId: string,
    videos: VideoAsset[],
    courseUrl: string,
  ): Promise<void> {
    AbortContext.throwIfAborted();

    await Promise.all(
      videos.map((video, index) =>
        this.assetRepository.saveAsset({
          id: video.id,
          courseId,
          type: "video",
          url: this.urlProvider.getVideoAssetUrl({ courseUrl, assetId: video.id }),
          metadata: {
            name: video.name || `Video ${index + 1}`,
            duration: video.duration,
            order_index: index + 1,
          },
          status: "PENDING",
        }),
      ),
    );
  }

  private async markPayloadsAsProcessed(
    repo: IInterceptedDataRepository,
    payloads: InterceptedPayload[],
  ): Promise<void> {
    AbortContext.throwIfAborted();

    await Promise.all(
      payloads.map((p) =>
        repo.markAsProcessed(p.filePath),
      ),
    );
  }

  private async cleanupWorkspace(
    repo: IInterceptedDataRepository,
    dir: string | null,
  ): Promise<void> {
    AbortContext.throwIfAborted();

    if (!dir) return;

    if (this.config.keepTempWorkspaces) {
      this.logger.info(`[OFFLINE] Manteniendo espacio de trabajo interceptado: ${dir}`);
      return;
    }

    await repo.deleteWorkspace();
  }
}