import type { ISettingsRepository } from "../domain/ports/ISettingsRepository";

export class ManageActivePath {
  constructor(private settingsRepo: ISettingsRepository) {}

  getActive(): string | null {
    return this.settingsRepo.getActiveLearningPath();
  }

  setActive(pathId: string): void {
    this.settingsRepo.setActiveLearningPath(pathId);
  }
}
