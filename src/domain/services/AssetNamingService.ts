export class AssetNamingService {
  /**
   * Generates the expected filename segments based on asset metadata.
   */
  public static generateSafeFilename(name: string, index?: string | number): string {
    const rawName = name.replace(/[^a-zA-Z0-9 _-]/g, '').trim().replace(/ +/g, '_');
    let safeName = rawName;
    
    if (index !== undefined && index !== null && index !== '') {
        const prefix = String(index).padStart(2, '0');
        safeName = `${prefix}_${rawName}`;
    }

    return safeName;
  }
}
