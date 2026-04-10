export const DownloadType = {
  ALL: 'all',
  VIDEO: 'video',
  GUIDE: 'guide',
} as const;

export type DownloadType = typeof DownloadType[keyof typeof DownloadType];
