import { getDb } from "../../platform/db/database";
import { SQLiteSettingsRepository } from "./infrastructure/SQLiteSettingsRepository";
import { ManageActivePath } from "./application/ManageActivePath";

// 1. Wiring
const repo = new SQLiteSettingsRepository(getDb());
const manageActivePath = new ManageActivePath(repo);

// 2. Public API
export const getActiveLearningPath = () => manageActivePath.getActive();
export const setActiveLearningPath = (pathId: string) => manageActivePath.setActive(pathId);
