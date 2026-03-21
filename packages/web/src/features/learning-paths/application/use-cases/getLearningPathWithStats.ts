import { getAssetsByCourseId } from "@features/courses";
import { getIsFavorite } from "@features/favorites";
import { getLearningPathProgress } from "@features/progress";
import type { ProgressStatus } from "@features/progress/domain/model/ProgressStatus";
import type { ILearningPathRepository } from "../../domain/ports/ILearningPathRepository";
import { getCoursesForPathId } from "./getCoursesForPathId";

export interface LearningPathWithStats {
  courseCount: number;
  completedCount: number;
  inProgressCount: number;
  progress: number;
  assetCount: number;
  status: ProgressStatus;
  isFavorite: boolean;
}

export interface GetLearningPathWithStatsRequest {
  id: string;
}

export const getLearningPathWithStats = (
  repo: ILearningPathRepository,
  request: GetLearningPathWithStatsRequest
): LearningPathWithStats => {
  const lpCourses = getCoursesForPathId(repo, request);
  const progress = getLearningPathProgress(request);

  // Calculate asset count for the path (completed assets across all courses)
  const assetCount = lpCourses.reduce((acc, course) => {
    const assets = getAssetsByCourseId({ id: course.id });
    return acc + assets.filter((a) => a.status === "COMPLETED").length;
  }, 0);

  return {
    courseCount: lpCourses.length,
    completedCount: progress?.completedItems || 0,
    inProgressCount: progress?.inProgressItems || 0,
    progress: progress?.progress || 0,
    assetCount,
    status: progress?.status || "not_started",
    isFavorite: getIsFavorite({ id: request.id, type: "learning-path" }),
  };
};
