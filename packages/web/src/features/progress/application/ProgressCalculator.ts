/**
 * Calcula el porcentaje de progreso basado en activos completados y en progreso.
 */
export function calculateProgressPercentage(completed: number, inProgress: number, total: number): number {
  if (total <= 0) return 0;
  const progress = Math.round(((completed + (inProgress * 0.5)) / total) * 100);
  return Math.min(100, Math.max(0, progress));
}
