import { type ProgressStatus } from "./ProgressStatus";

export interface CourseProgress {
    courseId: string;
    status: ProgressStatus;
    completedAssets: number;
    inProgressAssets: number;
    totalAssets: number;
    updatedAt: string;
}

export interface EnrichedCourseProgress extends CourseProgress {
    progress: number;
}