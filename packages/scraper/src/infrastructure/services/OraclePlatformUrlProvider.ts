import { IPlatformUrlProvider } from "@domain/services/IPlatformUrlProvider";
import { env } from "@config/env";
import { PLATFORM } from "@config/platform";

export class OraclePlatformUrlProvider implements IPlatformUrlProvider {
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = env.PLATFORM_BASE_URL;
  }

  resolveCourseUrl(target: string): { url: string, courseId: string } {
    let url = target;
    let courseId: string | undefined;

    // 1. Intentar extraer ID si parece una URL o path basándonos en el patrón configurado
    const pattern = PLATFORM.URL_PATTERNS.COURSE_PATH
      .replace('{slug}', '[^/]+')
      .replace('{id}', '(\\d+)');
    const regex = new RegExp(pattern, 'i');
    
    const match = target.match(regex);
    if (match) {
      courseId = match[1];
      if (!target.startsWith("http")) {
        url = new URL(target, this.baseUrl).href;
      }
    }
    // 2. Si es solo un número, es el ID directo
    else if (/^\d+$/.test(target)) {
      courseId = target;
      const path = PLATFORM.URL_PATTERNS.COURSE_PATH
        .replace('{slug}', "path")
        .replace('{id}', target);
      url = new URL(path, this.baseUrl).href;
    }

    if (!courseId) {
      throw new Error(`No se pudo extraer el ID del curso de: "${target}"`);
    }

    const finalUrl = url.endsWith('/') ? url : `${url}/`;
    return { url: finalUrl, courseId };
  }

  resolveLearningPathUrl(target: string): string {
    let url = target;
    let pathId: string | undefined;

    // 1. Intentar extraer ID si parece una URL o path basándonos en el patrón
    const pattern = PLATFORM.URL_PATTERNS.LEARNING_PATH
      .replace('{slug}', '[^/]+')
      .replace('{id}', '(\\d+)');
    const regex = new RegExp(pattern, 'i');
    
    const match = target.match(regex);
    if (match) {
      pathId = match[1];
      if (!target.startsWith("http")) {
        url = new URL(target, this.baseUrl).href;
      }
    }
    // 2. Si es solo un número, es el ID directo
    else if (/^\d+$/.test(target)) {
      pathId = target;
      const path = PLATFORM.URL_PATTERNS.LEARNING_PATH
        .replace('{slug}', "path")
        .replace('{id}', target);
      url = new URL(path, this.baseUrl).href;
    }

    if (!pathId) {
      throw new Error(`No se pudo extraer el ID del learning path de: "${target}"`);
    }

    return url.endsWith('/') ? url : `${url}/`;
  }

  getCourseUrl({ slug, id }: { slug: string, id: string}): string {
    const path = PLATFORM.URL_PATTERNS.COURSE_PATH
      .replace('{slug}', slug || "path")
      .replace('{id}', id);
    return new URL(path, this.baseUrl).href;
  }

  getGuideViewerUrl({courseId, offeringId, ekitId}: {courseId: string, offeringId: string, ekitId: string}): string {
    const path = PLATFORM.URL_PATTERNS.GUIDE_PATH
      .replace('{courseId}', courseId)
      .replace('{offeringId}', offeringId)
      .replace('{ekitId}', ekitId);
    return new URL(path, this.baseUrl).href;
  }

  getVideoAssetUrl({courseUrl, assetId}: {courseUrl: string, assetId: string}): string {
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
