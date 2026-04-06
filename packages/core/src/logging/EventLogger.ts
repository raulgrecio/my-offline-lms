import { LogBroker } from "./LogBroker";
import type { ILogger, LogLevel } from "./ILogger";

/**
 * An implementation of ILogger that emits log events to the LogBroker.
 * This decouples the logger caller from the actual log destination (console, file, etc.).
 */
export class EventLogger implements ILogger {
  constructor(private readonly defaultContext?: string) { }

  info(message: string): void {
    this.emit("info", message);
  }

  warn(message: string): void {
    this.emit("warn", message);
  }

  error(message: string, error?: unknown): void {
    this.emit("error", message, error);
  }

  debug(message: string): void {
    if (this.isDebugEnabled()) {
      this.emit("debug", message);
    }
  }

  withContext(context: string): EventLogger {
    return new EventLogger(context);
  }

  private isDebugEnabled(): boolean {
    if (typeof process !== "undefined") {
      return process.env.DEBUG === "true" || process.env.NODE_ENV === "development";
    }
    if (typeof window !== "undefined") {
      return (window as any).DEBUG === "true";
    }
    return false;
  }

  private emit(level: LogLevel, message: string, error?: unknown): void {
    LogBroker.emit(level, message, error, this.defaultContext);
  }
}
