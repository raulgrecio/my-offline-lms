export interface ISettingsRepository {
  getActiveLearningPath(): string | null;
  setActiveLearningPath(id: string): void;
}
