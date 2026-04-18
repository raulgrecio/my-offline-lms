export interface Result<T = void> {
  success: boolean;
  error?: string;
  data?: T;
}
