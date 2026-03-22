export interface InterceptedPayload {
  filePath: string;
  content: string;
}

export interface IInterceptedDataRepository {
  getPendingLearningPaths(): Promise<InterceptedPayload[]>;
  getPendingForLearningPath(pathId: string): Promise<InterceptedPayload[]>;
  getPendingCourses(): Promise<InterceptedPayload[]>;
  getPendingForCourse(courseId: string): Promise<InterceptedPayload[]>;
  deletePayload(filePath: string): Promise<void>;
  markAsProcessed(filePath: string): Promise<void>;
  deleteWorkspace(): Promise<void>;
}
