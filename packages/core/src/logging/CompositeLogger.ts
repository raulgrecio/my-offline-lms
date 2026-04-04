import type { ILogger } from "./ILogger";

/**
 * A logger that delegates all calls to multiple ILogger instances.
 * Useful for logging to multiple destinations (e.g. Console + File).
 */
export class CompositeLogger implements ILogger {
  constructor(
    private readonly loggers: ILogger[],
    private readonly defaultContext?: string
  ) {}

  info(message: string, context?: string): void {
    const ctx = context ?? this.defaultContext;
    this.loggers.forEach((l) => l.info(message, ctx));
  }

  warn(message: string, context?: string): void {
    const ctx = context ?? this.defaultContext;
    this.loggers.forEach((l) => l.warn(message, ctx));
  }

  error(message: string, error?: unknown, context?: string): void {
    const ctx = context ?? this.defaultContext;
    this.loggers.forEach((l) => l.error(message, error, ctx));
  }

  debug(message: string, context?: string): void {
    const ctx = context ?? this.defaultContext;
    this.loggers.forEach((l) => l.debug?.(message, ctx));
  }

  withContext(context: string): CompositeLogger {
    const contextualLoggers = this.loggers.map((l) => l.withContext(context));
    return new CompositeLogger(contextualLoggers, context);
  }
}
