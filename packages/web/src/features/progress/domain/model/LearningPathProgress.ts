import type { CollectionProgress } from "./CollectionProgress";

export interface LearningPathProgress extends CollectionProgress {
    id: string; // Alias de id
    completedCourses: number; // Alias de completedItems
    inProgressCourses: number; // Alias de inProgressItems
    totalCourses: number; // Alias de totalItems
}

export interface EnrichedLearningPathProgress extends LearningPathProgress {
    progress: number;
}
