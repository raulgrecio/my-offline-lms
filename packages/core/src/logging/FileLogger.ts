import * as fs from "fs";
import * as path from "path";
import type { ILogger } from "./ILogger";

/**
 * An implementation of ILogger that persists logs to a file.
 */
export class FileLogger implements ILogger {
  private readonly logPath: string;

  constructor(logPath: string, private readonly defaultContext?: string) {
    this.logPath = logPath;
    const dir = path.dirname(this.logPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  info(message: string, context?: string): void {
    this.append("INFO", message, context);
  }

  warn(message: string, context?: string): void {
    this.append("WARN", message, context);
  }

  error(message: string, error?: unknown, context?: string): void {
    let errorMsg = message;
    if (error instanceof Error) {
      errorMsg += ` - ${error.stack}`;
    } else if (error) {
      errorMsg += ` - ${JSON.stringify(error)}`;
    }
    this.append("ERROR", errorMsg, context);
  }

  debug(message: string, context?: string): void {
    this.append("DEBUG", message, context);
  }

  withContext(context: string): FileLogger {
    return new FileLogger(this.logPath, context);
  }

  private append(level: string, message: string, context?: string): void {
    const timestamp = new Date().toISOString();
    const ctx = context ?? this.defaultContext;
    const contextPart = ctx ? ` [${ctx}]` : "";
    const logLine = `[${timestamp}] ${level}${contextPart}: ${message}\n`;

    try {
      fs.appendFileSync(this.logPath, logLine);
    } catch (e) {
      // Fallback to console if file write fails to avoid silent failures
      console.error(`[FileLogger] Failed to write to ${this.logPath}`, e);
    }
  }
}
