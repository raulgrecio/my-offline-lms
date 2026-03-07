import { ILogger } from "@domain/services/ILogger";

export class ConsoleLogger implements ILogger {
  constructor(private readonly defaultContext?: string) {}

  info(message: string, context?: string): void {
    console.log(this.format('INFO', message, context));
  }

  warn(message: string, context?: string): void {
    console.warn(this.format('WARN', message, context));
  }

  error(message: string, error?: unknown, context?: string): void {
    console.error(this.format('ERROR', message, context));
    if (error) {
      console.error(error);
    }
  }

  debug(message: string, context?: string): void {
    if (process.env.DEBUG === 'true') {
      console.debug(this.format('DEBUG', message, context));
    }
  }

  withContext(context: string): ConsoleLogger {
    return new ConsoleLogger(context);
  }

  private format(level: string, message: string, context?: string): string {
    const timestamp = new Date().toISOString();
    const ctx = context ?? this.defaultContext;
    const contextPart = ctx ? ` [${ctx}]` : "";

    return `[${timestamp}] ${level}${contextPart}: ${message}`;
  }
}