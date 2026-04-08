import type { LogLevel } from "./ILogger";
import { LogEventBus, type LogSubscriber } from "./LogEventBus";
import { LogHistory } from "./LogHistory";
import { LogRouter, type RouteOptions } from "./LogRouter";
import type { ILogger } from "./ILogger";
import type { LogEvent } from "./LogEvent";
const LOG_CHANNEL_NAME = 'my-offline-lms-logs';

// Helper to get BroadcastChannel safely in any environment
const getChannel = () => {
  if (typeof BroadcastChannel !== 'undefined') {
    const channel = new BroadcastChannel(LOG_CHANNEL_NAME);
    // In Node.js, we unref it to not block process exit
    if ((channel as any).unref) (channel as any).unref();
    return channel;
  }
  return null;
};

/**
 * Standardized logging facade for the overall application.
 * Manages the transition from simple method calls to a robust Event-Driven system.
 */
class LogBrokerFacade {
  private readonly bus = new LogEventBus();
  private readonly history = new LogHistory(this.bus);
  private readonly router = new LogRouter(this.bus);
  private readonly channel = getChannel();

  constructor() {
    if (this.channel) {
      this.channel.onmessage = (event) => {
        const logEvent = event.data as LogEvent;
        this.bus.emit(logEvent);
      };
    }
  }

  /**
   * Main entry point to emit standardized LogEvents from the application.
   */
  emit(level: LogLevel, message: string, error?: unknown, context?: string) {
    const event: LogEvent = {
      type: "LOG_EMITTED",
      payload: {
        level,
        message,
        error
      },
      metadata: {
        id: Math.random().toString(36).substring(7),
        timestamp: new Date().toISOString(),
        context
      }
    };

    // 1. Emit locally to this instance's subscribers
    this.bus.emit(event);

    // 2. Broadcast to other instances in the same process (if supported)
    if (this.channel) {
      this.channel.postMessage(event);
    }
  }

  /**
   * Forwards subscriptions to the core EventBus using LogEvents.
   */
  subscribe(callback: LogSubscriber): () => void {
    const unsub = this.bus.subscribe(callback);
    // Send history to new subscriber using the recorded events
    this.history.getEntries().forEach(event => callback(event));
    return unsub;
  }

  /**
   * Forwards transport registration to the Router.
   */
  addTransport(logger: ILogger, options: RouteOptions = {}) {
    this.router.addTransport(logger, options);
  }

  clear() {
    this.history.clear();
  }

  getHistory() {
    return this.history.getEntries();
  }
}

export const LogBroker = new LogBrokerFacade();
