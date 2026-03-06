import { IPlatformUrlProvider } from "../../domain/services/IPlatformUrlProvider";
import { env } from "../../config/env";

export class OraclePlatformUrlProvider implements IPlatformUrlProvider {
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = env.PLATFORM_BASE_URL;
  }

  resolveCourseUrl(target: string): string {
    let url = target;
    if (!target.startsWith("http")) {
      url = new URL(`/ou/course/slug/${target}`, this.baseUrl).href;
    }
    return url.endsWith('/') ? url : `${url}/`;
  }

  resolveLearningPathUrl(target: string): string {
    if (/^\d+$/.test(target)) {
      return new URL(`/ou/learning-path/path/${target}`, this.baseUrl).href;
    }
    return target;
  }

  getCourseUrl(slug: string, id: string): string {
    return new URL(`/ou/course/${slug}/${id}`, this.baseUrl).href;
  }
}
