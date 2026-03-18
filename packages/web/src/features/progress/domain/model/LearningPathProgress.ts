import { type ProgressStatus } from "./ProgressStatus";

export interface LearningPathProgress {
    pathId: string;
    status: ProgressStatus;
    completedCourses: number;
    inProgressCourses: number;
    totalCourses: number;
    updatedAt: string;
}

export interface EnrichedLearningPathProgress extends LearningPathProgress {
    progress: number;
}
