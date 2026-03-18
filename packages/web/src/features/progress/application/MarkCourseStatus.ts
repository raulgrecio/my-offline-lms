import type { IProgressRepository } from "../domain/ports/IProgressRepository";
import type { ProgressStatus } from "../domain/model/ProgressStatus";

export class MarkCourseStatus {
  constructor(private progressRepo: IProgressRepository) { }

  execute({ courseId, status }: { courseId: string, status: ProgressStatus }): void {
    this.progressRepo.markCourseStatus({ courseId, status });
  }
}
