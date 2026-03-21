import { getDb } from "@platform/db/database";
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

// 2. Wiring
const repo = new SQLiteLearningPathRepository(getDb());
const manager = new LearningPathManager(repo);

// 3. Public API
export const getAllLearningPaths = () => manager.getAllLearningPaths();

export const getCoursesForPathId = (request: GetCoursesForPathIdRequest) =>
  manager.getCoursesForPathId(request);

export const getLearningPathById = (request: GetLearningPathByIdRequest) =>
  manager.getLearningPathById(request);

export const getLearningPathDetails = (request: GetLearningPathDetailsRequest) =>
  manager.getLearningPathDetails(request);
