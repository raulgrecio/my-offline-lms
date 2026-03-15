import type { LearningPath } from "@my-offline-lms/core";
import type { ILearningPathRepository } from "../domain/ports/ILearningPathRepository";

export class GetPathCatalog {
  constructor(private pathRepo: ILearningPathRepository) {}

  execute(): LearningPath[] {
    return this.pathRepo.getAllLearningPaths();
  }
}
