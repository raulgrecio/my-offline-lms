export const PLATFORM = {
  SELECTORS: {
    COURSE: {
      GUIDES_TAB: "#guides-tab",
    },
    GUIDE: {
      IFRAME: "#ekitIframe",
      FLIPBOOK_PAGES: ".thumbnailSwiper .title",
    },
    VIDEO: {
      START_BTN: "#playerIdbtn",
      PLAY_BTN: ".vjs-big-play-button, button[aria-label=\"Play\"]",
    }
  },
  URL_PATTERNS: {
    COURSE_PATH: "ou/course/{slug}/{id}",
    LEARNING_PATH: "ou/learning-path/{slug}/{id}",
    GUIDE_PATH: "ekit/{courseId}/{offeringId}/{ekitId}/course",
    GUIDE_IMAGE_BASE_REPLACEMENT: /\/mobile\/index\.html(\?.*)?$/i,
    GUIDE_IMAGE_BASE_PATH: "/files/mobile/",
  },
  INTERCEPTOR: {
    FILTER_API: [
      /api\/eml[-/_](content|learner)[-/_]courses\//i,
      /api\/eml[-/_](content|learner)[-/_]learning[-/_]path\//i,
      /ekit/i,
    ],
    FILES: {
      COURSE: /courses[-/_].*\d+.*metadata.*\.json/i,
      LEARNING_PATH: /learning[-/_]path.*\d+.*pagedata.*\.json/i,
    }
  },
  CONSTANTS: {
    ORACLE: {
      VIDEO_TYPE_ID: "1",
    }
  }
} as const;
