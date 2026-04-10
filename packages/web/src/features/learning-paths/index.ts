import { getDb } from "@web/platform/db/database";
import { createLazyService } from "@core/di";
import { LearningPathManager } from "./application/LearningPathManager";
import { type GetLearningPathDetailsRequest, type PathWithCourses } from "./application/use-cases/getLearningPathDetails";
import { SQLiteLearningPathRepository } from "./infrastructure/SQLiteLearningPathRepository";
import type { GetCoursesForPathIdRequest } from "./application/use-cases/getCoursesForPathId";
import type { GetLearningPathByIdRequest } from "./application/use-cases/getLearningPath";

// 1. Types
export type {
  GetCoursesForPathIdRequest,
  GetLearningPathByIdRequest,
  GetLearningPathDetailsRequest,
  PathWithCourses,
};

// 2. Wiring (Lazy)
const getManager = createLazyService(async () => {
  const db = await getDb();
  const repo = new SQLiteLearningPathRepository(db);
  return new LearningPathManager(repo);
});

// 3. Public API
export const getAllLearningPaths = async () => (await getManager()).getAllLearningPaths();

export const getCoursesForPathId = async (request: GetCoursesForPathIdRequest) =>
  (await getManager()).getCoursesForPathId(request);

export const getLearningPathById = async (request: GetLearningPathByIdRequest) =>
  (await getManager()).getLearningPathById(request);

export const getLearningPathDetails = async (request: GetLearningPathDetailsRequest) =>
  (await getManager()).getLearningPathDetails(request);
