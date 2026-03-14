import { Asset, Course } from '@my-offline-lms/core';

export interface ICourseRepository {
  /** Save or update a Course */
  saveCourse(course: Course): void;
  /** Find a Course by its ID */
  getCourseById(id: string): Course | null;
  /** Get all assets for a given course */
  getCourseAssets(courseId: string): Asset[];
}

