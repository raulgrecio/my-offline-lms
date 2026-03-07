export interface IPlatformUrlProvider {
  resolveCourseUrl(target: string): string;
  resolveLearningPathUrl(target: string): string;
  getCourseUrl({ slug, id }: { slug: string, id: string}): string;
  getGuideViewerUrl({ courseId, offeringId, ekitId }: { courseId: string, offeringId: string, ekitId: string}): string;
  getVideoAssetUrl({ courseUrl, assetId }: { courseUrl: string, assetId: string}): string;
  getGuideImageBaseUrl(iframeSrc: string): string;
}
