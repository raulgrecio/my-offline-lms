import type { Course } from "@core/domain";
import type { ICourseRepository } from "../../domain/ports/ICourseRepository";

export const getAllCourses = (courseRepo: ICourseRepository): Course[] => {
  return courseRepo.getAllCourses();
}
