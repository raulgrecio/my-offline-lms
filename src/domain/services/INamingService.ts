export interface INamingService {
  slugify(input: string): string;
  cleanUrl(input: string): string;
  generateSafeFilename(name: string, index?: string | number): string;
  extractOfferingId(url: string): string | null;
  extractIdFromInput(input: string): string;
}
