import type { ISettingsRepository } from "../../domain/ports/ISettingsRepository";

export interface SetActiveLearningPathRequest {
  id: string;
}

export const setActiveLearningPath = (
  settingsRepo: ISettingsRepository,
  { id }: SetActiveLearningPathRequest
): void => {
  settingsRepo.setActiveLearningPath(id);
};
