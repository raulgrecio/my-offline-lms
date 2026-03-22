import type { ILogger } from "./ILogger";

export class NoopLogger implements ILogger {
  info(_message: string, _context?: string): void {}
  warn(_message: string, _context?: string): void {}
  error(_message: string, _error?: unknown, _context?: string): void {}
  debug(_message: string, _context?: string): void {}
  withContext(_context: string): ILogger {
    return this;
  }
}
