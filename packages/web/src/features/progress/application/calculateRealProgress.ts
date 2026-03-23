import type { AssetType } from '@my-offline-lms/core/models';
import type { ProgressStatus } from "../domain/model/ProgressStatus";
import { COMPLETION_THRESHOLD } from "./constants";

export interface CalculateRealProgressParams {
  type: AssetType;
  visitedSegments: number;
  totalSegments: number;
  // opcional (reglas de negocio)
  ignoreSegments?: Set<number>;
}

export interface RealProgressResult {
  progress: number; // 0 → 1
  status: ProgressStatus;
  completed: boolean;
  // opcional para UI
  remainingSegments: number;
}

export function calculateRealProgress({
  visitedSegments,
  totalSegments,
  ignoreSegments,
}: CalculateRealProgressParams): RealProgressResult {

  // 1. Protección básica
  if (totalSegments <= 0) {
    return {
      progress: 0,
      status: "not_started",
      completed: false,
      remainingSegments: 0,
    };
  }

  // 2. Ajustar total válido
  const ignoredCount = ignoreSegments?.size ?? 0;
  const validTotal = Math.max(totalSegments - ignoredCount, 0);

  if (validTotal === 0) {
    return {
      progress: 1,
      status: "completed",
      completed: true,
      remainingSegments: 0,
    };
  }

  // 3. Ajustar vistos válidos
  // ⚠️ aquí asumimos que NO guardas segmentos ignorados
  // si los guardas, habría que filtrarlos (más caro)
  const validVisited = Math.min(visitedSegments, validTotal);

  // 4. progreso
  const progress = validVisited / validTotal;

  // 5. completed (regla de negocio)
  const completed = progress >= COMPLETION_THRESHOLD;

  // 6. status
  let status: ProgressStatus = "not_started";

  if (completed) {
    status = "completed";
  } else if (validVisited > 0) {
    status = "in_progress";
  }

  // 7. remaining (para UI)
  const remainingSegments = Math.max(validTotal - validVisited, 0);

  return {
    progress,
    status,
    completed,
    remainingSegments,
  };
}
