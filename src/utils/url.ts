export function sanitizeUrl(url: string): string {
    if (!url) return url;
    // Replace double slashes with a single slash, but ignore the protocol part (e.g., https://)
    return url.replace(/(?<!:)\/+/g, "/");
}


export const toSlug = (input: string): string =>
  input
    .normalize("NFD") // quita acentos
    .replace(/[\u0300-\u036f]/g, "") // quita acentos diacríticos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")