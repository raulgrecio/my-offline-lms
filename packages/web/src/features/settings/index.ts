import { getDb } from "@platform/db/database";
import { SettingManager } from "./application/SettingManager";
import { type SetActiveLearningPathRequest } from "./application/use-cases/setActiveLearningPath";
import { SQLiteSettingsRepository } from "./infrastructure/SQLiteSettingsRepository";

// 1. Types
export type { SetActiveLearningPathRequest };

// 2. Wiring (Lazy)
let _manager: SettingManager | null = null;
async function getManager() {
  if (!_manager) {
    const db = await getDb();
    const repo = new SQLiteSettingsRepository(db);
    _manager = new SettingManager(repo);
  }
  return _manager;
}

// 3. Public API
/** @deprecated el sistema de path activo está en desuso */
export const getActiveLearningPath = async () => (await getManager()).getActiveLearningPath();

/** @deprecated el sistema de path activo está en desuso */
export const setActiveLearningPath = async (request: SetActiveLearningPathRequest) =>
  (await getManager()).setActiveLearningPath(request);
