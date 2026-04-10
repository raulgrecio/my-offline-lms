import type { LogEvent } from "./LogEvent";

export type LogSubscriber = (event: LogEvent) => void;

/**
 * A basic Event Bus specialized for LogEvents.
 * Implements the Publisher-Subscriber pattern for standardized logging.
 */
export class LogEventBus {
  private subscribers: Set<LogSubscriber> = new Set();

  /**
   * Registers a new subscriber for log events.
   */
  subscribe(callback: LogSubscriber): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  /**
   * Broadcasts a LogEvent to all registered subscribers.
   */
  emit(event: LogEvent): void {
    this.subscribers.forEach((callback) => callback(event));
  }
}
