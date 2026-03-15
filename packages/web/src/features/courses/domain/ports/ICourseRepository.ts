import { type Course, type Asset } from "@my-offline-lms/core";

export interface ICourseRepository {
  getAllCourses(): Course[];
  getCourseById(id: string): Course | null;
  getCourseAssets(courseId: string): Asset[];
}
