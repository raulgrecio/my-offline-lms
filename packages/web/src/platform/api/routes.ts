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
    SEGMENTS: (assetId: string, type: string) => `/api/progress/segments?assetId=${assetId}&type=${type}`,
  },
  FAVORITES: {
    TOGGLE: "/api/favorites/toggle",
  },
  SCRAPER: {
    AVAILABLE: "/api/scraper/available",
    AUTH_STATUS: "/api/scraper/auth-status",
    SYNC: "/api/scraper/sync",
    LOGS: "/api/scraper/logs",
    LOGIN: "/api/scraper/login",
  },
} as const;
