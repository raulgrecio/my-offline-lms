import { type LogEvent } from "./LogEvent";
import type { LogEventBus } from "./LogEventBus";

/**
 * Handles the historical tracking of log entries based on LogEvents.
 */
export class LogHistory {
  private history: LogEvent[] = [];
  private readonly MAX_HISTORY: number;

  constructor(bus: LogEventBus, maxHistory = 200) {
    this.MAX_HISTORY = maxHistory;
    // Subscribe to events that emit log entries
    bus.subscribe((event) => {
      // Don't clutter history with debug logs
      if (event.payload.level !== 'debug') {
        this.add(event);
      }
    });
  }

  /**
   * Adds an entry from an external source (e.g., BroadcastChannel).
   */
  addExternal(event: LogEvent): void {
    if (event.payload.level !== 'debug') {
      this.add(event);
    }
  }

  /**
   * Adds an entry to the history buffer.
   */
  private add(event: LogEvent): void {
    this.history.push(event);
    if (this.history.length > this.MAX_HISTORY) {
      this.history.shift();
    }
  }

  /**
   * Returns a copy of the current history.
   */
  getEntries(): LogEvent[] {
    return [...this.history];
  }

  /**
   * Clears the current history.
   */
  clear(): void {
    this.history = [];
  }
}
