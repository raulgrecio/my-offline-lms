import type { ILogger } from "./ILogger";
import { LogBroker } from "./LogBroker";

export class ConsoleLogger implements ILogger {
  constructor(private readonly defaultContext?: string) { }

  info(message: string, context?: string): void {
    const ctx = context ?? this.defaultContext;
    console.log(this.format('INFO', message, context));
    LogBroker.handleLog('info', message, ctx);
  }

  warn(message: string, context?: string): void {
    const ctx = context ?? this.defaultContext;
    console.warn(this.format('WARN', message, context));
    LogBroker.handleLog('warn', message, ctx);
  }

  error(message: string, error?: unknown, context?: string): void {
    const ctx = context ?? this.defaultContext;
    console.error(this.format('ERROR', message, context));
    if (error) {
      console.error(error);
    }
    LogBroker.handleLog('error', message, ctx);
  }

  debug(message: string, context?: string): void {
    const ctx = context ?? this.defaultContext;
    const isTest = typeof process !== 'undefined';
    const isDebug = isTest
      ? process.env.DEBUG === 'true'
      : (typeof window !== 'undefined' && (window as any).DEBUG === 'true');

    if (isDebug) {
      console.debug(this.format('DEBUG', message, context));
      LogBroker.handleLog('debug', message, ctx);
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