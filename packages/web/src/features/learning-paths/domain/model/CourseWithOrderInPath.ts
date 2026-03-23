import type { Course } from '@my-offline-lms/core/models';

export type CourseWithOrderInPath = Course & {
  orderIndex: number;
};