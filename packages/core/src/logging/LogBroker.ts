import type { LogLevel } from "./ILogger";

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  error?: unknown;
}

type LogSubscriber = (entry: LogEntry) => void;

class LogBrokerImpl {
  private subscribers: Set<LogSubscriber> = new Set();
  private history: LogEntry[] = [];
  private readonly MAX_HISTORY = 200;

  subscribe(callback: LogSubscriber): () => void {
    this.subscribers.add(callback);
    // Send history to new subscriber
    this.history.forEach(entry => callback(entry));
    return () => this.subscribers.delete(callback);
  }

  emit(level: LogLevel, message: string, error?: unknown, context?: string) {
    const entry: LogEntry = {
      id: Math.random().toString(36).substring(7),
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      error
    };

    // Only store in history if it's not a debug message (keeps Web UI clean)
    if (level !== 'debug') {
      this.history.push(entry);
      if (this.history.length > this.MAX_HISTORY) {
        this.history.shift();
      }
    }

    this.subscribers.forEach(callback => callback(entry));
  }

  /**
   * Internal method for testing purposes to reset the broker state.
   */
  clear() {
    this.subscribers.clear();
    this.history = [];
  }
}

export const LogBroker = new LogBrokerImpl();
