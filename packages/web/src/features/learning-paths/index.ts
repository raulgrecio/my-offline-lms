import { getDb } from "../../platform/db/database";
import { SQLiteLearningPathRepository } from "./infrastructure/SQLiteLearningPathRepository";
import { GetPathCatalog } from "./application/GetPathCatalog";
import { GetPathDetails } from "./application/GetPathDetails";

// 1. Wiring
const repo = new SQLiteLearningPathRepository(getDb());
const getPathCatalog = new GetPathCatalog(repo);
const getPathDetails = new GetPathDetails(repo);

// 2. Public API
export const getAllLearningPaths = () => getPathCatalog.execute();
export const getLearningPathById = (id: string) => getPathDetails.execute(id)?.path ?? null;
export const getCoursesForPath = (pathId: string) => getPathDetails.execute(pathId)?.courses ?? [];
