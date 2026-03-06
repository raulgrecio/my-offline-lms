import { INamingService } from "./INamingService";

export class AssetNamingService implements INamingService {
  slugify(input: string): string {
    if (!input) return "";
    
    return input
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  cleanUrl(input: string): string {
    if (!input) return "";
    // Replace double slashes with a single slash, but ignore the protocol part (e.g., https://)
    return input.replace(/(?<!:)\/+/g, "/");
  }

  generateSafeFilename(name: string, index?: string | number): string {
    const rawName = name.replace(/[^a-zA-Z0-9 _-]/g, '').trim().replace(/ +/g, '_');
    let safeName = rawName;
    
    if (index !== undefined && index !== null && index !== '') {
        const prefix = String(index).padStart(2, '0');
        safeName = `${prefix}_${rawName}`;
    }

    return safeName;
  }
}
