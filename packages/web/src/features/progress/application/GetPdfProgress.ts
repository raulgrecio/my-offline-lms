import type { IProgressRepository } from "../domain/ports/IProgressRepository";
import type { PdfProgress } from "../domain/model/PdfProgress";

export class GetPdfProgress {
  constructor(private repository: IProgressRepository) {}

  execute({ assetId }: { assetId: string }): PdfProgress | null {
    return this.repository.getPdfProgress(assetId);
  }
}
