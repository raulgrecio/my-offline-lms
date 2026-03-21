import type { AssetType } from "@my-offline-lms/core";
import type { AssetProgress } from "../../domain/model/AssetProgress";
import type { IProgressRepository } from "../../domain/ports/IProgressRepository";
import { calculateRealProgress } from "../calculateRealProgress";
import { VIDEO_SEGMENT_SIZE, GUIDE_SEGMENT_SIZE } from "../constants";

export interface UpdateAssetProgressRequest {
  assetId: string;
  id: string;
  type: AssetType;
  position: number;
  duration?: number;
}

export const updateAssetProgress = (progressRepository: IProgressRepository, { assetId, id, type, position, duration = 0 }: UpdateAssetProgressRequest): void => {
  // 1. Obtener estado previo
  const existing: AssetProgress | null = progressRepository.getAssetProgress({ id: assetId, type });
  const wasCompleted = existing?.completed || false;
  let visitedSegments = existing?.visitedSegments || 0;

  // 2. Manejo de segmentos e incremento incremental
  const segmentSize = type === "video" ? VIDEO_SEGMENT_SIZE : GUIDE_SEGMENT_SIZE;
  const currentSegment = type === "video" ? Math.floor(position / segmentSize) : position;

  const isNewSegment = progressRepository.saveSegment({ id: assetId, type, segment: currentSegment });
  if (isNewSegment) {
    progressRepository.incrementVisitedSegments({ id: assetId, type });
    visitedSegments++;
  }

  // 3. Determinar completitud basada en consumo real (segmentos)
  const finalDuration = duration || (existing?.maxPosition || 0);
  let isNowCompleted = wasCompleted;

  if (!wasCompleted && finalDuration > 0) {
    let totalSegments = existing?.totalSegments || 0;

    // Si no tenemos el total calculado, lo calculamos y guardamos ahora
    if (totalSegments === 0) {
      totalSegments = type === "video"
        ? Math.ceil(finalDuration / segmentSize)
        : finalDuration; // total_pages para guías

      if (totalSegments > 0) {
        progressRepository.setTotalSegments({ id: assetId, type, totalSegments });
      }
    }

    // Usar la nueva función modular para el cálculo real
    const result = calculateRealProgress({
      type,
      visitedSegments,
      totalSegments
    });

    isNowCompleted = result.completed;
  }

  // 4. Actualizar progreso global (mantiene posición para resume)
  progressRepository.saveAssetProgress({
    id: assetId,
    type,
    position,
    duration: finalDuration,
    completed: isNowCompleted
  });

  // 5. Recálculo selectivo si el estado acaba de cambiar a completado
  if (isNowCompleted && !wasCompleted) {
    const associatedCourseIds = progressRepository.getCourseIdsForAsset(assetId);
    const allAffectedCourses = Array.from(new Set([...associatedCourseIds, id]));

    for (const affectedCourseId of allAffectedCourses) {
      progressRepository.recalculateCourseProgress(affectedCourseId);

      const affectedPathIds = progressRepository.getLearningPathsForCourse(affectedCourseId);
      for (const affectedPathId of affectedPathIds) {
        progressRepository.recalculateLearningPathProgress(affectedPathId);
      }
    }
  }
}
