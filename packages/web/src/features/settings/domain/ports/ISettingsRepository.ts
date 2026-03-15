export interface ISettingsRepository {
  getActiveLearningPath(): string | null;
  setActiveLearningPath(pathId: string): void;
}
