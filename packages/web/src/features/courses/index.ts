import { getDb } from "../../platform/db/database";
import { CourseManager } from "./application/CourseManager";
import type { GetAssetByIdRequest } from "./application/use-cases/getAssetById";
import type { CourseWithAssets, GetCourseDetailsRequest } from "./application/use-cases/getCourseDetails";
import type { UpdateAssetMetadataRequest } from "./application/use-cases/updateAssetMetadata";
import { SQLiteCourseRepository } from "./infrastructure/SQLiteCourseRepository";

// 1. Types
export type {
  CourseWithAssets,
  GetAssetByIdRequest,
  UpdateAssetMetadataRequest,
};

// 2. Wiring
const repo = new SQLiteCourseRepository(getDb());
const manager = new CourseManager(repo);

// 3. Public API
export const getAllCourses = () => manager.getAllCourses();

export const getAssetById = ({ assetId }: GetAssetByIdRequest) =>
  manager.getAssetById({ assetId });

export const getCourseAssets = ({ courseId }: GetCourseDetailsRequest) =>
  manager.getCourseDetails({ courseId })?.assets ?? [];

export const getCourseById = ({ courseId }: GetCourseDetailsRequest) =>
  manager.getCourseDetails({ courseId })?.course ?? null;

export const updateAssetMetadata = ({ assetId, totalPages }: UpdateAssetMetadataRequest) =>
  manager.updateAssetMetadata({ assetId, totalPages });
