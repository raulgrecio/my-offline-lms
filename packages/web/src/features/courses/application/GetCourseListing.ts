import type { Course } from "@my-offline-lms/core";
import type { ICourseRepository } from "../domain/ports/ICourseRepository";

export class GetCourseListing {
  constructor(private courseRepo: ICourseRepository) {}

  execute(): Course[] {
    return this.courseRepo.getAllCourses();
  }
}
