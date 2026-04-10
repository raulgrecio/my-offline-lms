import type { ILogger } from "./ILogger";

export class NoopLogger implements ILogger {
  info(_message: string): void {}
  warn(_message: string): void {}
  error(_message: string, _error?: unknown): void {}
  debug(_message: string): void {}
  withContext(_context: string): NoopLogger {
    return this;
  }
}
