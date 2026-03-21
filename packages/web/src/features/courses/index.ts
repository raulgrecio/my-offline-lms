import { getDb } from "@platform/db/database";
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

// 2. Wiring
const repo = new SQLiteCourseRepository(getDb());
const manager = new CourseManager(repo);

// 3. Public API
export const getAllCourses = () => manager.getAllCourses();

export const getAssetById = ({ id }: GetAssetByIdRequest) =>
  manager.getAssetById({ id });

export const getAssetsByCourseId = ({ id }: GetAssetsByCourseIdRequest) =>
  manager.getAssetsByCourseId({ id });

export const getCourseById = ({ id }: GetCourseByIdRequest) =>
  manager.getCourseById({ id });

export const updateAssetTotalPages = ({ id, totalPages }: UpdateAssetTotalPagesRequest) =>
  manager.updateAssetTotalPages({ id, totalPages });
