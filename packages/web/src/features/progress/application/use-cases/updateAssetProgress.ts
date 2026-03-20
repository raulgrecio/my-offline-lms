import type { AssetType } from "@my-offline-lms/core";
import type { AssetProgress } from "../../domain/model/AssetProgress";
import type { ProgressStatus } from "../../domain/model/ProgressStatus";
import type { IProgressRepository } from "../../domain/ports/IProgressRepository";
import { calculateStatus } from "../calculateStatus";

export interface UpdateAssetProgressRequest {
  assetId: string;
  courseId: string;
  type: AssetType;
  position: number;
  duration?: number;
}

export const updateAssetProgress = (progressRepository: IProgressRepository, { assetId, courseId, type, position, duration = 0 }: UpdateAssetProgressRequest): void => {
  // 1. Obtener estado previo (SELECT rápido por PK)
  let oldStatus: ProgressStatus = 'not_started';
  let prevMax = 0;

  const existing: AssetProgress | null = progressRepository.getAssetProgress(assetId);
  const wasCompleted = existing?.completed || false;

  if (existing) {
    prevMax = existing.maxPosition || 0;
    oldStatus = calculateStatus(existing.position, prevMax, existing.completed);
  }

  // 2. Determinar nuevo estado basado en el pulso actual
  const finalDuration = duration || prevMax;
  const isNowCompleted = (duration > 0 && (position / duration) >= 0.9);

  const newStatus = calculateStatus(position, finalDuration, isNowCompleted);

  // 3. Update global asset progress
  if (type === "video") {
    progressRepository.updateVideoProgress({
      assetId, position, duration: finalDuration, completed: isNowCompleted
    });
  } else {
    progressRepository.updateGuideProgress({
      assetId, position, duration: finalDuration, completed: isNowCompleted
    });
  }

  // 4. Recálculo selectivo: SI el estado del curso ha cambiado O si el asset se acaba de completar
  const assetJustCompleted = isNowCompleted && !wasCompleted;

  if (oldStatus !== newStatus || assetJustCompleted) {
    const associatedCourseIds = progressRepository.getCourseIdsForAsset(assetId);
    const allAffectedCourses = Array.from(new Set([...associatedCourseIds, courseId]));

    for (const affectedCourseId of allAffectedCourses) {
      progressRepository.recalculateCourseProgress(affectedCourseId);

      const affectedPathIds = progressRepository.getLearningPathsForCourse(affectedCourseId);
      for (const pathId of affectedPathIds) {
        progressRepository.recalculateLearningPathProgress(pathId);
      }
    }
  }
}
