import { getDb } from "../../platform/db/database";
import { CourseManager } from "./application/CourseManager";
import type { GetAssetByIdRequest } from "./application/use-cases/getAssetById";
import type { GetCourseAssetsRequest } from "./application/use-cases/getCourseAssets";
import type { GetCourseByIdRequest } from "./application/use-cases/getCourseById";
import type { CourseWithAssets, GetCourseDetailsRequest } from "./application/use-cases/getCourseDetails";
import type { UpdateAssetMetadataRequest } from "./application/use-cases/updateAssetMetadata";
import { SQLiteCourseRepository } from "./infrastructure/SQLiteCourseRepository";

// 1. Types
export type {
  CourseWithAssets,
  GetAssetByIdRequest,
  GetCourseAssetsRequest,
  GetCourseByIdRequest,
  GetCourseDetailsRequest,
  UpdateAssetMetadataRequest,
};

// 2. Wiring
const repo = new SQLiteCourseRepository(getDb());
const manager = new CourseManager(repo);

// 3. Public API
export const getAllCourses = () => manager.getAllCourses();

export const getAssetById = ({ assetId }: GetAssetByIdRequest) =>
  manager.getAssetById({ assetId });

/** @deprecated el sistema de path activo está en desuso */
export const getCourseDetails = (request: GetCourseDetailsRequest) =>
  manager.getCourseDetails(request);

export const getCourseAssets = ({ courseId }: GetCourseAssetsRequest) =>
  manager.getCourseAssets({ courseId });

export const getCourseById = ({ courseId }: GetCourseByIdRequest) =>
  manager.getCourseById({ courseId });

export const updateAssetMetadata = ({ assetId, totalPages }: UpdateAssetMetadataRequest) =>
  manager.updateAssetMetadata({ assetId, totalPages });
