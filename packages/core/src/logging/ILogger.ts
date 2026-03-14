export interface ILogger {
  info(message: string, context?: string): void;
  warn(message: string, context?: string): void;
  error(message: string, error?: unknown, context?: string): void;
  debug?(message: string, context?: string): void;
  withContext(context: string): ILogger;
}
