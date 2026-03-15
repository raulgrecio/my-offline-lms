import type { IProgressRepository } from "../domain/ports/IProgressRepository";
import type { CourseStatusType } from "../domain/model/CourseProgress";

export class MarkCourseStatus {
  constructor(private progressRepo: IProgressRepository) { }

  execute(courseId: string, status: CourseStatusType): void {
    this.progressRepo.markCourseStatus(courseId, status);
  }
}
