import type { ISettingsRepository } from "../domain/ports/ISettingsRepository";
import { getActiveLearningPath } from "./use-cases/getActiveLearningPath";
import { setActiveLearningPath, type SetActiveLearningPathRequest } from "./use-cases/setActiveLearningPath";

export class SettingManager {
  constructor(private repo: ISettingsRepository) { }

  /** @deprecated el sistema de path activo está en desuso */
  getActiveLearningPath() {
    return getActiveLearningPath(this.repo);
  }

  /** @deprecated el sistema de path activo está en desuso */
  setActiveLearningPath(request: SetActiveLearningPathRequest) {
    return setActiveLearningPath(this.repo, request);
  }
}
