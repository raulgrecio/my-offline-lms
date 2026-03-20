import { type Course, type LearningPath } from "@my-offline-lms/core";

export interface ILearningPathRepository {
  getAllLearningPaths(): LearningPath[];
  getLearningPath(id: string): LearningPath | null;
  getCoursesForPath(pathId: string): (Course & { orderIndex: number })[];
}
