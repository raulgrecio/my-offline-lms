import type { AssetType } from '@my-offline-lms/core/models';
import type { AssetProgress } from "../../domain/model/AssetProgress";
import type { IProgressRepository } from "../../domain/ports/IProgressRepository";
import { calculateRealProgress } from "../calculateRealProgress";
import { ASSET_PROGRESS_CONFIGS } from "../assetProgressConfigs";

export interface UpdateAssetProgressRequest {
  assetId: string;
  id: string;
  type: AssetType;
  position: number;
  duration?: number;
}

export const updateAssetProgress = (progressRepository: IProgressRepository, { assetId, id, type, position, duration = 0 }: UpdateAssetProgressRequest): void => {
  const config = ASSET_PROGRESS_CONFIGS[type];

  // 1. Obtener estado previo
  const existing: AssetProgress | null = progressRepository.getAssetProgress({ id: assetId, type });
  const wasCompleted = existing?.completed || false;
  let visitedSegments = existing?.visitedSegments || 0;

  // 2. Manejo de segmentos e incremento incremental
  const currentSegment = config.getSegment(position);

  const isNewSegment = progressRepository.saveSegment({ id: assetId, type, segment: currentSegment });
  if (isNewSegment) {
    progressRepository.incrementVisitedSegments({ id: assetId, type });
    visitedSegments++;
  }

  // 3. Determinar completitud basada en consumo real (segmentos)
  const finalDuration = duration || (existing?.maxPosition || 0);
  let isNowCompleted = wasCompleted;
  let totalSegments = existing?.totalSegments || 0;

  if (finalDuration > 0) {
    const expectedTotalSegments = config.getTotalSegments(finalDuration);

    // Si el total ha cambiado o no existía, actualizarlo
    if (totalSegments !== expectedTotalSegments && expectedTotalSegments > 0) {
      totalSegments = expectedTotalSegments;
      progressRepository.setTotalSegments({ id: assetId, type, totalSegments });
    }
  }

  if (!wasCompleted && totalSegments > 0) {
    // Usar la nueva función modular para el cálculo real
    const result = calculateRealProgress({
      type,
      visitedSegments,
      totalSegments
    });

    isNowCompleted = result.completed;
  }

  // 4. Actualizar progreso global (mantiene posición para resume e indica el punto más lejano alcanzado)
  progressRepository.saveAssetProgress({
    id: assetId,
    type,
    position,
    maxPosition: position,
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
