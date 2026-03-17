import type { IProgressRepository } from "../domain/ports/IProgressRepository";

export class UpdatePdfProgress {
  constructor(private repository: IProgressRepository) {}

  execute({ assetId, page, completed }: { assetId: string; page: number; completed?: boolean }): void {
    this.repository.updatePdfProgress({ assetId, page, completed });
  }
}
