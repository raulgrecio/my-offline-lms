import { getDb } from "@platform/db/database";
import { SettingManager } from "./application/SettingManager";
import { type SetActiveLearningPathRequest } from "./application/use-cases/setActiveLearningPath";
import { SQLiteSettingsRepository } from "./infrastructure/SQLiteSettingsRepository";

// 1. Types
export type { SetActiveLearningPathRequest };

// 2. Wiring
const repo = new SQLiteSettingsRepository(getDb());
const manager = new SettingManager(repo);

// 3. Public API
/** @deprecated el sistema de path activo está en desuso */
export const getActiveLearningPath = () => manager.getActiveLearningPath();

/** @deprecated el sistema de path activo está en desuso */
export const setActiveLearningPath = (request: SetActiveLearningPathRequest) =>
  manager.setActiveLearningPath(request);
