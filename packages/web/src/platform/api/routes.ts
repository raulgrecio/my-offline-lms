/**
 * API route constants and helpers for the web package.
 */
export const API_ROUTES = {
  SETTINGS: {
    ASSET_PATHS: "/api/settings/asset-paths",
  },
  ASSETS: {
    LOCAL_ASSET: (path: string) => `/api/asset/local-asset?path=${encodeURIComponent(path)}`,
    METADATA: (assetId?: string) => 
      assetId ? `/api/assets/metadata?assetId=${assetId}` : "/api/assets/metadata",
  },
  PROGRESS: {
    COURSE: "/api/progress/course",
    PDF: "/api/progress/pdf",
    VIDEO: "/api/progress/video",
  },
} as const;
