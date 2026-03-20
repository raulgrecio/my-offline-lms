import type { Course } from "@my-offline-lms/core";
import type { ICourseRepository } from "../../domain/ports/ICourseRepository";

export const getAllCourses = (courseRepo: ICourseRepository): Course[] => {
  return courseRepo.getAllCourses();
}
