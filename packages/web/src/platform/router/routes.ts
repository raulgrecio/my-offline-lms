/**
 * Application route constants and helpers.
 */
export const APP_ROUTES = {
  HOME: "/",
  COURSES: {
    INDEX: "/courses",
    DETAIL: (id: string) => `/courses/${id}`,
    WITH_FILTER: (all: boolean) => `/courses?all=${all}`,
  },
  LEARNING_PATHS: {
    INDEX: "/learning-paths",
    DETAIL: (id: string) => `/learning-paths/${id}`,
  },
  VIEWER: {
    GUIDE: ({ assetId, courseId, path }: { assetId: string, courseId: string, path: string }) => `/viewer/?assetId=${assetId}&courseId=${courseId}&path=${encodeURIComponent(path)}`,
  },
  SETTINGS: "/settings",
} as const;
