import type { LogLevel } from "./ILogger";
import { LogEventBus, type LogSubscriber } from "./LogEventBus";
import { LogHistory } from "./LogHistory";
import { LogRouter, type RouteOptions } from "./LogRouter";
import type { ILogger } from "./ILogger";
import type { LogEvent } from "./LogEvent";
import { getSafeBroadcastChannel } from "../broadcast/BroadcastChannelUtils";

const LOG_CHANNEL_NAME = 'my-offline-lms-logs';


/**
 * Standardized logging facade for the overall application.
 * Manages the transition from simple method calls to a robust Event-Driven system.
 */
class LogBrokerFacade {
  private readonly bus = new LogEventBus();
  private readonly history = new LogHistory(this.bus);
  private readonly router = new LogRouter(this.bus);
  private readonly channel = getSafeBroadcastChannel(LOG_CHANNEL_NAME);

  constructor() {
    if (this.channel) {
      this.channel.onmessage = (event) => {
        const logEvent = event.data as LogEvent;
        const remoteEvent: LogEvent = {
          ...logEvent,
          metadata: {
            ...logEvent.metadata,
            isRemote: true
          }
        };
        this.bus.emit(remoteEvent);
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

  clearTransports() {
    this.router.clearTransports();
  }

  clear() {
    this.history.clear();
  }

  getHistory() {
    return this.history.getEntries();
  }
}

export const LogBroker = new LogBrokerFacade();
