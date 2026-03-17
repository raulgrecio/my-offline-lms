export interface PdfProgress {
  assetId: string;
  page: number;
  maxPage: number;
  completed: boolean;
  updatedAt?: string;
}
