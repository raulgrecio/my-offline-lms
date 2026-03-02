/**
 * Generates the expected filename segments based on asset metadata.
 */
export function getAssetFilename(name: string, params?: {index: string | number | null}): string {
    const rawName = name.replace(/[^a-zA-Z0-9 _-]/g, '').trim().replace(/ +/g, '_');
    let safeName = rawName;
    
    if (params?.index) {
        const prefix = String(params.index).padStart(2, '0');
        safeName = `${prefix}_${rawName}`;
    }

    return safeName;
}

