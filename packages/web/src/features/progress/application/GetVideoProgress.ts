import type { VideoProgress } from "../domain/model/VideoProgress";
import type { IProgressRepository } from "../domain/ports/IProgressRepository";

export class GetVideoProgress {
  constructor(private progressRepo: IProgressRepository) {}

  execute(assetId: string): VideoProgress | null {
    return this.progressRepo.getVideoProgress(assetId);
  }
}
