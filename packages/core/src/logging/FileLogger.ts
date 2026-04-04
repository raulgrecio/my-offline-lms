import type { ILogger } from "./ILogger";
import type { IFileSystem, IPath } from "../filesystem";

/**
 * An implementation of ILogger that persists logs to a file.
 */
export class FileLogger implements ILogger {
  constructor(
    private readonly logPath: string,
    private readonly fs: IFileSystem,
    private readonly path: IPath,
    private readonly defaultContext?: string
  ) {}

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
    return new FileLogger(this.logPath, this.fs, this.path, context);
  }

  private append(level: string, message: string, context?: string): void {
    const timestamp = new Date().toISOString();
    const ctx = context ?? this.defaultContext;
    const contextPart = ctx ? ` [${ctx}]` : "";
    const logLine = `[${timestamp}] ${level}${contextPart}: ${message}\n`;

    // Fire and forget to match ILogger synchronous interface
    this.ensureDirAndAppend(logLine).catch((e) => {
      // Fallback to console if write fails to avoid silent failures
      console.error(`[FileLogger] Failed to write to ${this.logPath}`, e);
    });
  }

  private async ensureDirAndAppend(logLine: string): Promise<void> {
    const dir = this.path.dirname(this.logPath);
    if (!(await this.fs.exists(dir))) {
      await this.fs.mkdir(dir, { recursive: true });
    }
    await this.fs.appendFile(this.logPath, logLine);
  }
}
