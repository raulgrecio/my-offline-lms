import type { IDatabase } from '@core/database';
import type { ISettingsRepository } from "../domain/ports/ISettingsRepository";

export class SQLiteSettingsRepository implements ISettingsRepository {
  constructor(private db: IDatabase) { }

  getActiveLearningPath(): string | null {
    const row = this.db
      .prepare("SELECT value FROM UserSettings WHERE key = 'active_path_id'")
      .get() as any;
    return row?.value ?? null;
  }

  setActiveLearningPath(pathId: string): void {
    this.db
      .prepare(
        `
      INSERT INTO UserSettings (key, value) VALUES ('active_path_id', ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `,
      )
      .run(pathId);
  }
}
