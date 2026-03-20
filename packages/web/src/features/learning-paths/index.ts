import { getDb } from "../../platform/db/database";
import { LearningPathManager } from "./application/LearningPathManager";
import type { GetPathDetailsRequest, PathWithCourses } from "./application/use-cases/getPathDetails";
import { SQLiteLearningPathRepository } from "./infrastructure/SQLiteLearningPathRepository";

// 1. Types
export type { GetPathDetailsRequest, PathWithCourses };

// 2. Wiring
const repo = new SQLiteLearningPathRepository(getDb());
const manager = new LearningPathManager(repo);

// 3. Public API
export const getAllLearningPaths = () => manager.getAllLearningPaths();

export const getLearningPathById = (request: GetPathDetailsRequest) =>
  manager.getLearningPath(request);

export const getCoursesForPath = (request: GetPathDetailsRequest) =>
  manager.getCoursesForPath(request);
