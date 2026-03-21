import { getDb } from "@platform/db/database";
import { CourseManager } from "./application/CourseManager";
import type { GetAssetByIdRequest } from "./application/use-cases/getAssetById";
import type { GetCourseAssetsRequest } from "./application/use-cases/getCourseAssets";
import type { GetCourseByIdRequest } from "./application/use-cases/getCourseById";
import type { UpdateAssetMetadataRequest } from "./application/use-cases/updateAssetMetadata";
import { SQLiteCourseRepository } from "./infrastructure/SQLiteCourseRepository";

// 1. Types
export type {
  GetAssetByIdRequest,
  GetCourseAssetsRequest,
  GetCourseByIdRequest,
  UpdateAssetMetadataRequest,
};

// 2. Wiring
const repo = new SQLiteCourseRepository(getDb());
const manager = new CourseManager(repo);

// 3. Public API
export const getAllCourses = () => manager.getAllCourses();

export const getAssetById = ({ assetId }: GetAssetByIdRequest) =>
  manager.getAssetById({ assetId });

export const getCourseAssets = ({ courseId }: GetCourseAssetsRequest) =>
  manager.getCourseAssets({ courseId });

export const getCourseById = ({ courseId }: GetCourseByIdRequest) =>
  manager.getCourseById({ courseId });

export const updateAssetMetadata = ({ assetId, totalPages }: UpdateAssetMetadataRequest) =>
  manager.updateAssetMetadata({ assetId, totalPages });
