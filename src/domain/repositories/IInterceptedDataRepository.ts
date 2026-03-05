export interface InterceptedPayload {
  filePath: string;
  content: string;
}

export interface IInterceptedDataRepository {
  getPendingLearningPaths(): InterceptedPayload[];
  getPendingCourses(): InterceptedPayload[];
  deletePayload(filePath: string): void;
}
