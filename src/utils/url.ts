export function sanitizeUrl(url: string): string {
    if (!url) return url;
    // Replace double slashes with a single slash, but ignore the protocol part (e.g., https://)
    return url.replace(/(?<!:)\/+/g, "/");
}
