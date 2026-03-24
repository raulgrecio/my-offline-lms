import { getDb } from "@platform/db/database";
import { createLazyService } from "@my-offline-lms/core/di";
import { CourseManager } from "./application/CourseManager";
import type { GetAssetByIdRequest } from "./application/use-cases/getAssetById";
import type { GetAssetsByCourseIdRequest } from "./application/use-cases/getAssetsByCourseId";
import type { GetCourseByIdRequest } from "./application/use-cases/getCourseById";
import { type UpdateAssetTotalPagesRequest } from "./application/use-cases/updateAssetTotalPages";
import { SQLiteCourseRepository } from "./infrastructure/SQLiteCourseRepository";

// 1. Types
export type {
  GetAssetByIdRequest,
  GetAssetsByCourseIdRequest as GetCourseAssetsRequest,
  GetCourseByIdRequest,
  UpdateAssetTotalPagesRequest as UpdateAssetMetadataRequest,
};

// 2. Wiring (Lazy)
const getManager = createLazyService(async () => {
  const db = await getDb();
  const repo = new SQLiteCourseRepository(db);
  return new CourseManager(repo);
});

// 3. Public API
export const getAllCourses = async () => (await getManager()).getAllCourses();

export const getAssetById = async ({ id }: GetAssetByIdRequest) =>
  (await getManager()).getAssetById({ id });

export const getAssetsByCourseId = async ({ id }: GetAssetsByCourseIdRequest) =>
  (await getManager()).getAssetsByCourseId({ id });

export const getCourseById = async ({ id }: GetCourseByIdRequest) =>
  (await getManager()).getCourseById({ id });

export const updateAssetTotalPages = async ({ id, totalPages }: UpdateAssetTotalPagesRequest) =>
  (await getManager()).updateAssetTotalPages({ id, totalPages });
