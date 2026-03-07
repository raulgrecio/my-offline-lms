import { IPlatformUrlProvider } from "../../domain/services/IPlatformUrlProvider";
import { env } from "../../config/env";
import { PLATFORM } from "../../config/platform";

export class OraclePlatformUrlProvider implements IPlatformUrlProvider {
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = env.PLATFORM_BASE_URL;
  }

  resolveCourseUrl(target: string): string {
    let url = target;
    if (!target.startsWith("http")) {
      const path = PLATFORM.URL_PATTERNS.COURSE_PATH
        .replace('{slug}', "path")
        .replace('{id}', target);
      url = new URL(path, this.baseUrl).href;
    }
    return url.endsWith('/') ? url : `${url}/`;
  }

  resolveLearningPathUrl(target: string): string {
    if (/^\d+$/.test(target)) {
      const path = PLATFORM.URL_PATTERNS.LEARNING_PATH
        .replace('{slug}', "path")
        .replace('{id}', target);
      return new URL(path, this.baseUrl).href;
    }
    return target;
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
