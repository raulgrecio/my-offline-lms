import type { IPlatformUrlProvider } from "@scraper/features/platform-sync";
import { env } from "@scraper/config";
import { PLATFORM } from "@scraper/config";

export class OraclePlatformUrlProvider implements IPlatformUrlProvider {
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = env.PLATFORM_BASE_URL;
  }

  resolveCourseUrl(target: string): { url: string, courseId: string } {
    let courseId: string | undefined;
    let slug: string | undefined;

    // 1. Intentar extraer Slug e ID si parece una URL o path
    const pattern = PLATFORM.URL_PATTERNS.COURSE_PATH
      .replace('{slug}', '([^/]+)')
      .replace('{id}', '(\\d+)');
    const regex = new RegExp(pattern, 'i');

    const match = target.match(regex);
    if (match) {
      slug = match[1];
      courseId = match[2];
    }
    // 2. Si es solo un número, es el ID directo
    else if (/^\d+$/.test(target)) {
      courseId = target;
    }

    if (!courseId) {
      throw new Error(`No se pudo extraer el ID del curso de: "${target}"`);
    }

    const url = this.getCourseUrl({ slug, id: courseId });

    return { 
      url: url.endsWith('/') ? url : `${url}/`, 
      courseId 
    };
  }

  resolveLearningPathUrl(target: string): { url: string, pathId: string } {
    let pathId: string | undefined;
    let slug: string | undefined;

    // 1. Intentar extraer Slug e ID si parece una URL o path
    const pattern = PLATFORM.URL_PATTERNS.LEARNING_PATH
      .replace('{slug}', '([^/]+)')
      .replace('{id}', '(\\d+)');
    const regex = new RegExp(pattern, 'i');

    const match = target.match(regex);
    if (match) {
      slug = match[1];
      pathId = match[2];
    }
    // 2. Si es solo un número, es el ID directo
    else if (/^\d+$/.test(target)) {
      pathId = target;
    }

    if (!pathId) {
      throw new Error(`No se pudo extraer el ID del learning path de: "${target}"`);
    }

    const url = this.getLearningPathUrl({ slug, id: pathId });

    return { 
      url: url.endsWith('/') ? url : `${url}/`, 
      pathId 
    };
  }

  getCourseUrl({ slug, id }: { slug?: string, id: string }): string {
    const path = PLATFORM.URL_PATTERNS.COURSE_PATH
      .replace('{slug}', slug || "path")
      .replace('{id}', id);
    return new URL(path, this.baseUrl).href;
  }

  getLearningPathUrl({ slug, id }: { slug?: string, id: string }): string {
    const path = PLATFORM.URL_PATTERNS.LEARNING_PATH
      .replace('{slug}', slug || "path")
      .replace('{id}', id);
    return new URL(path, this.baseUrl).href;
  }

  getGuideViewerUrl({ courseId, offeringId, ekitId }: { courseId: string, offeringId: string, ekitId: string }): string {
    const path = PLATFORM.URL_PATTERNS.GUIDE_PATH
      .replace('{courseId}', courseId)
      .replace('{offeringId}', offeringId)
      .replace('{ekitId}', ekitId);
    return new URL(path, this.baseUrl).href;
  }

  getVideoAssetUrl({ courseUrl, assetId }: { courseUrl: string, assetId: string }): string {
    const base = courseUrl.endsWith('/') ? courseUrl : `${courseUrl}/`;
    return `${base}${assetId}`;
  }

  getGuideImageBaseUrl(iframeSrc: string): string {
    const baseImgUrl = iframeSrc.replace(
      PLATFORM.URL_PATTERNS.GUIDE_IMAGE_BASE_REPLACEMENT,
      PLATFORM.URL_PATTERNS.GUIDE_IMAGE_BASE_PATH
    );
    return baseImgUrl.endsWith('/') ? baseImgUrl : `${baseImgUrl}/`;
  }
}
