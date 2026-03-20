import type { ISettingsRepository } from "../../domain/ports/ISettingsRepository";

export const getActiveLearningPath = (settingsRepo: ISettingsRepository): string | null => {
  return settingsRepo.getActiveLearningPath();
};
