import type { AssetProgress } from "../domain/model/AssetProgress";
import type { IProgressRepository } from "../domain/ports/IProgressRepository";
import type { AssetType } from "@my-offline-lms/core";

export interface UpdateAssetProgressRequest {
  assetId: string;
  courseId: string;
  type: AssetType;
  position: number;
  duration?: number;
}

type Status = 'not_started' | 'in_progress' | 'completed';

export class UpdateAssetProgress {
  constructor(private progressRepository: IProgressRepository) { }

  execute({ assetId, courseId, type, position, duration = 0 }: UpdateAssetProgressRequest): void {

    // 1. Obtener estado previo (SELECT rápido por PK)
    let oldStatus: Status = 'not_started';
    let prevMax = 0;

    const existing: AssetProgress | null = this.progressRepository.getAssetProgress(assetId);
    const wasCompleted = existing?.completed || false;

    if (existing) {
      prevMax = existing.maxPosition || 0;
      oldStatus = this.calculateStatus(existing.position, prevMax, existing.completed);
    }


    // 2. Determinar nuevo estado basado en el pulso actual
    const finalDuration = duration || prevMax;
    const isNowCompleted = (duration > 0 && (position / duration) >= 0.9);

    const newStatus = this.calculateStatus(position, finalDuration, isNowCompleted);

    // 3. Update global asset progress
    if (type === "video") {
      this.progressRepository.updateVideoProgress({
        assetId, position, duration: finalDuration, completed: isNowCompleted
      });
    } else {
      this.progressRepository.updateGuideProgress({
        assetId, position, duration: finalDuration, completed: isNowCompleted
      });
    }

    // 4. Recálculo selectivo: SI el estado del curso ha cambiado O si el asset se acaba de completar
    const assetJustCompleted = isNowCompleted && !wasCompleted;

    if (oldStatus !== newStatus || assetJustCompleted) {
      const associatedCourseIds = this.progressRepository.getCourseIdsForAsset(assetId);
      const allAffectedCourses = Array.from(new Set([...associatedCourseIds, courseId]));

      for (const affectedCourseId of allAffectedCourses) {
        this.progressRepository.recalculateCourseProgress(affectedCourseId);

        const affectedPathIds = this.progressRepository.getLearningPathsForCourse(affectedCourseId);
        for (const pathId of affectedPathIds) {
          this.progressRepository.recalculateLearningPathProgress(pathId);
        }
      }
    }
  }

  private calculateStatus(pos: number, dur: number, completed: boolean): Status {
    if (completed || (dur > 0 && (pos / dur) >= 0.9)) return 'completed';
    if (pos > 0) return 'in_progress';
    return 'not_started';
  }
}
