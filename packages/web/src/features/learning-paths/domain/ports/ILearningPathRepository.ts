import { type LearningPath } from "@my-offline-lms/core";
import type { CourseWithOrderInPath } from "../model/CourseWithOrderInPath";

export interface ILearningPathRepository {
  getAllLearningPaths(): LearningPath[];
  getLearningPath(id: string): LearningPath | null;
  getCoursesForPathId(id: string): CourseWithOrderInPath[];
}
