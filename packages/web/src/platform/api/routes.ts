/**
 * API route constants and helpers for the web package.
 */
export const API_ROUTES = {
  SETTINGS: {
    ASSET_PATHS: "/api/settings/asset-paths",
  },
  ASSETS: {
    LOCAL_ASSET: (path: string) => `/api/assets/local-asset?path=${encodeURIComponent(path)}`,
    METADATA: (assetId?: string) => `/api/assets/metadata${assetId ? `?assetId=${assetId}` : ""}`,
  },
  PROGRESS: {
    COURSE: "/api/progress/course",
    GUIDE: "/api/progress/guide",
    VIDEO: "/api/progress/video",
  },
} as const;
