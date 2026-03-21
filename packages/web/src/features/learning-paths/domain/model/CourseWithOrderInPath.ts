import type { Course } from "@my-offline-lms/core";

export type CourseWithOrderInPath = Course & {
  orderIndex: number;
};