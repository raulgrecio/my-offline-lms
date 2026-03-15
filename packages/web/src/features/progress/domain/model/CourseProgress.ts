export interface CourseProgress {
    courseId: string;
    status: "not_started" | "in_progress" | "completed";
    updatedAt: string;
}