import { getDb } from "../platform/db/database";
import { SQLiteCourseRepository } from "../features/courses/infrastructure/SQLiteCourseRepository";
import { SQLiteLearningPathRepository } from "../features/learning-paths/infrastructure/SQLiteLearningPathRepository";
import { SQLiteProgressRepository } from "../features/progress/infrastructure/SQLiteProgressRepository";
import { SQLiteSettingsRepository } from "../features/settings/infrastructure/SQLiteSettingsRepository";

// Incializar repositorios
const db = getDb();

const courseRepo = new SQLiteCourseRepository(db);
const pathRepo = new SQLiteLearningPathRepository(db);
const progressRepo = new SQLiteProgressRepository(db);
const settingsRepo = new SQLiteSettingsRepository(db);

// Exportar funciones individuales para compatibilidad con Astro y API
export const getAllCourses = () => courseRepo.getAllCourses();
export const getCourseById = (id: string) => courseRepo.getCourseById(id);
export const getCourseAssets = (courseId: string) => courseRepo.getCourseAssets(courseId);

export const getAllLearningPaths = () => pathRepo.getAllLearningPaths();
export const getLearningPathById = (id: string) => pathRepo.getLearningPathById(id);
export const getCoursesForPath = (pathId: string) => pathRepo.getCoursesForPath(pathId);

export const getVideoProgress = (assetId: string) => progressRepo.getVideoProgress(assetId);
export const getCourseProgress = (courseId: string) => progressRepo.getCourseProgress(courseId);
export const getAllCourseProgress = () => progressRepo.getAllCourseProgress();
export const getLastWatchedAsset = () => progressRepo.getLastWatchedAsset();
export const updateVideoProgress = (assetId: string, pos: number, comp?: boolean) =>
  progressRepo.updateVideoProgress(assetId, pos, comp);
export const markCourseStatus = (courseId: string, status: any) =>
  progressRepo.markCourseStatus(courseId, status);

export const getActiveLearningPath = () => settingsRepo.getActiveLearningPath();
export const setActiveLearningPath = (pathId: string) => settingsRepo.setActiveLearningPath(pathId);
