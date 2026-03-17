import { type Metadata } from "@my-offline-lms/core";

import { getDb } from "../../platform/db/database";
import { SQLiteCourseRepository } from "./infrastructure/SQLiteCourseRepository";
import { GetCourseListing } from "./application/GetCourseListing";
import { GetCourseDetails } from "./application/GetCourseDetails";
import { UpdateGuideTotalPages } from "./application/UpdateAssetMetadata";

// 1. Wiring (Privado)
const repo = new SQLiteCourseRepository(getDb());
const getCourseListing = new GetCourseListing(repo);
const getCourseDetails = new GetCourseDetails(repo);
const updateGuideTotalPagesUC = new UpdateGuideTotalPages(repo);

// 2. Public API
export const getAllCourses = () => getCourseListing.execute();
export const getCourseById = (courseId: string) => getCourseDetails.execute({ courseId })?.course ?? null;
export const getCourseAssets = (courseId: string) => getCourseDetails.execute({ courseId })?.assets ?? [];
export const getAssetById = (assetId: string) => repo.getAssetById(assetId);
export const updateGuideTotalPages = (assetId: string, totalPages: number) => updateGuideTotalPagesUC.execute({ assetId, totalPages });
