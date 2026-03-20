import type { ISettingsRepository } from "../../domain/ports/ISettingsRepository";

export interface SetActiveLearningPathRequest {
  pathId: string;
}

export const setActiveLearningPath = (
  settingsRepo: ISettingsRepository,
  { pathId }: SetActiveLearningPathRequest
): void => {
  settingsRepo.setActiveLearningPath(pathId);
};
