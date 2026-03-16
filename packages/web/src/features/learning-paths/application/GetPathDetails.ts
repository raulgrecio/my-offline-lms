import type { LearningPath, Course } from "@my-offline-lms/core";
import type { ILearningPathRepository } from "../domain/ports/ILearningPathRepository";

export interface PathWithCourses {
  path: LearningPath;
  courses: (Course & { orderIndex: number })[]; // TODO: TAL VEZ MERECE UN DTO APARTE
}

export class GetPathDetails {
  constructor(private pathRepo: ILearningPathRepository) { }

  execute({pathId}: {pathId: string}): PathWithCourses | null {
    const path = this.pathRepo.getLearningPathById(pathId);
    if (!path) return null;

    const courses = this.pathRepo.getCoursesForPath(pathId);
    return { path, courses };
  }
}
