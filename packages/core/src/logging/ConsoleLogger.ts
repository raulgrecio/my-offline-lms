import type { ILogger } from "./ILogger";

/**
 * An implementation of ILogger that outputs logs to the console.
 */
export class ConsoleLogger implements ILogger {
  constructor(private readonly defaultContext?: string) {}

  info(message: string): void {
    console.log(this.format("INFO", message));
  }

  warn(message: string): void {
    console.warn(this.format("WARN", message));
  }

  error(message: string, error?: unknown): void {
    console.error(this.format("ERROR", message));
    if (error) {
      console.error(error);
    }
  }

  debug(message: string): void {
    if (this.isDebugEnabled()) {
      console.debug(this.format("DEBUG", message));
    }
  }

  withContext(context: string): ConsoleLogger {
    return new ConsoleLogger(context);
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

  private format(level: string, message: string): string {
    const timestamp = new Date().toISOString();
    const contextPart = this.defaultContext ? ` [${this.defaultContext}]` : "";
    return `[${timestamp}] ${level}${contextPart}: ${message}`;
  }
}