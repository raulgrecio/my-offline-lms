import type { ProgressStatus } from "../domain/model/ProgressStatus";

export const calculateStatus = (pos: number, dur: number, completed: boolean): ProgressStatus => {
  if (completed || (dur > 0 && (pos / dur) >= 0.9)) return 'completed';
  if (pos > 0) return 'in_progress';
  return 'not_started';
};