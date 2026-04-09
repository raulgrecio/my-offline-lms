import type { ILogger, LogLevel } from "./ILogger";
import type { LogEvent } from "./LogEvent";
import type { LogEventBus } from "./LogEventBus";

export interface RouteOptions {
  minLevel?: LogLevel;
  contextFilter?: string | string[];
}

const LevelPriority: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * Intelligent Router that connects standardized LogEvents to concrete Transports.
 */
export class LogRouter {
  private routes: Array<{ logger: ILogger; options: RouteOptions }> = [];

  constructor(bus: LogEventBus) {
    bus.subscribe((event) => this.route(event));
  }

  addTransport(logger: ILogger, options: RouteOptions = {}): void {
    this.routes.push({ logger, options });
  }

  clearTransports(): void {
    this.routes = [];
  }

  /**
   * Evaluates each route using the Event's Metadata and Payload.
   */
  private route(event: LogEvent): void {
    const { level, message, error } = event.payload;
    const { context } = event.metadata;

    for (const { logger, options } of this.routes) {
      if (this.shouldRoute(event, options)) {
        // Prepare contextual logger based on metadata
        const log = context ? logger.withContext(context) : logger;
        this.dispatch(log, level, message, error);
      }
    }
  }

  private dispatch(logger: ILogger, level: LogLevel, message: string, error?: unknown): void {
    switch (level) {
      case "info":
        logger.info(message);
        break;
      case "warn":
        logger.warn(message);
        break;
      case "error":
        logger.error(message, error);
        break;
      case "debug":
        logger.debug?.(message);
        break;
    }
  }

  private shouldRoute(event: LogEvent, options: RouteOptions): boolean {
    const minLevelPriority = LevelPriority[options.minLevel ?? "debug"];
    const currentLevelPriority = LevelPriority[event.payload.level];

    // Priority filter (checks only the payload.level)
    if (currentLevelPriority < minLevelPriority) return false;

    // Context filter (checks only the metadata.context)
    if (options.contextFilter) {
      const allowed = Array.isArray(options.contextFilter)
        ? options.contextFilter
        : [options.contextFilter];
      const context = event.metadata.context;
      if (!context || !allowed.includes(context)) return false;
    }

    return true;
  }
}
