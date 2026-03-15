export type CourseStatusType = "not_started" | "in_progress" | "completed";

export interface CourseProgress {
    courseId: string;
    status: CourseStatusType;
    updatedAt: string;
}