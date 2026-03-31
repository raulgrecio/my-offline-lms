import type { Course } from '@core/domain';

export type CourseWithOrderInPath = Course & {
  orderIndex: number;
};