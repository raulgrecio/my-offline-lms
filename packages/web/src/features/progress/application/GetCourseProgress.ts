import type { CourseProgress } from "../domain/model/CourseProgress";
import type { IProgressRepository } from "../domain/ports/IProgressRepository";

export class GetCourseProgress {
  constructor(private progressRepo: IProgressRepository) {}

  execute({courseId}: {courseId: string}): CourseProgress | null {
    return this.progressRepo.getCourseProgress(courseId);
  }
}
