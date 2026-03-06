export interface IPlatformUrlProvider {
  resolveCourseUrl(target: string): string;
  resolveLearningPathUrl(target: string): string;
  getCourseUrl(slug: string, id: string): string;
}
