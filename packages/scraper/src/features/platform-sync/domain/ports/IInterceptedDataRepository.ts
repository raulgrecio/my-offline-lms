export interface InterceptedPayload {
  filePath: string;
  content: string;
}

export interface IInterceptedDataRepository {
  getPendingLearningPaths(): InterceptedPayload[];
  getPendingForLearningPath(pathId: string): InterceptedPayload[];
  getPendingCourses(): InterceptedPayload[];
  getPendingForCourse(courseId: string): InterceptedPayload[];
  deletePayload(filePath: string): void;
  markAsProcessed(filePath: string): void;
  deleteWorkspace(): void;
}
