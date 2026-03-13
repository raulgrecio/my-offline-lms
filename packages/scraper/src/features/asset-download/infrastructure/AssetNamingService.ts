import { INamingService } from "../domain/ports/INamingService";

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
    return input.trim().replace(/(?<!:)\/+/g, "/");
  }

  generateSafeFilename(name: string, index?: string | number): string {
    if (!name) return "unnamed_asset";
    const rawName = name.replace(/[^a-zA-Z0-9 _-]/g, '').trim().replace(/ +/g, '_');
    let safeName = rawName;
    
    if (index !== undefined && index !== null && index !== '') {
        const prefix = String(index).padStart(2, '0');
        safeName = `${prefix}_${rawName}`;
    }

    return safeName;
  }

  extractOfferingId(url: string): string | null {
    if (!url) return null;
    // Match /learning-path/OFFERING_ID/pathId/... or ?offeringId=OFFERING_ID
    const match = url.match(/\/api\/eml-content\/learning-path\/(\d+)\//) || 
                  url.match(/[?&]offeringId=(\d+)/);
    return match ? match[1] : null;
  }

  extractIdFromInput(input: string): string {
    if (!input) return "";
    
    // 1. Limpieza básica (trim y colapsar //) y quitar barra final
    const baseClean = this.cleanUrl(input).replace(/\/$/, "");
    
    // 2. Extraer el segmento final (el ID)
    if (baseClean.includes('/')) {
      return baseClean.split('/').pop() || input;
    }
    return baseClean;
  }
}
