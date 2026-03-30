export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  context?: string;
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

  handleLog(level: LogEntry['level'], message: string, context?: string) {
    const entry: LogEntry = {
      id: Math.random().toString(36).substring(7),
      timestamp: new Date().toISOString(),
      level,
      message,
      context
    };

    this.history.push(entry);
    if (this.history.length > this.MAX_HISTORY) {
      this.history.shift();
    }

    this.subscribers.forEach(sub => sub(entry));
  }

  clear() {
    this.history = [];
  }
}

export const LogBroker = new LogBrokerImpl();
