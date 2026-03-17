export interface PdfProgress {
  assetId: string;
  page: number;
  completed: boolean;
  updatedAt?: string;
}
