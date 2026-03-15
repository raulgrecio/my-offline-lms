import type { Course, Asset } from "@my-offline-lms/core";
import type { ICourseRepository } from "../domain/ports/ICourseRepository";

export interface CourseWithAssets {
  course: Course;
  assets: Asset[];
}

export class GetCourseDetails {
  constructor(private courseRepo: ICourseRepository) {}

  execute(courseId: string): CourseWithAssets | null {
    const course = this.courseRepo.getCourseById(courseId);
    if (!course) return null;

    const assets = this.courseRepo.getCourseAssets(courseId);
    return { course, assets };
  }
}
