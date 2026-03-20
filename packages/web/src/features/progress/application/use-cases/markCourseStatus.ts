import type { IProgressRepository } from "../../domain/ports/IProgressRepository";
import type { ProgressStatus } from "../../domain/model/ProgressStatus";

export interface MarkCourseStatusRequest {
  courseId: string;
  status: ProgressStatus;
}

export const markCourseStatus = (progressRepo: IProgressRepository, { courseId, status }: MarkCourseStatusRequest): void => {
  progressRepo.markCourseStatus({ courseId, status });
}
