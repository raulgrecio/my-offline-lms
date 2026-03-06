export interface INamingService {
  slugify(input: string): string;
  cleanUrl(input: string): string;
  generateSafeFilename(name: string, index?: string | number): string;
}
