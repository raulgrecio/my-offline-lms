import type { LogLevel } from "./ILogger";
import { LogEventBus, type LogSubscriber } from "./LogEventBus";
import { LogHistory } from "./LogHistory";
import { LogRouter, type RouteOptions } from "./LogRouter";
import type { ILogger } from "./ILogger";

/**
 * Standardized logging facade for the overall application.
 * Manages the transition from simple method calls to a robust Event-Driven system.
 */
class LogBrokerFacade {
  private readonly bus = new LogEventBus();
  private readonly history = new LogHistory(this.bus);
  private readonly router = new LogRouter(this.bus);

  /**
   * Main entry point to emit standardized LogEvents from the application.
   */
  emit(level: LogLevel, message: string, error?: unknown, context?: string) {
    // Construct the fully fledged event implementing the IEvent contract
    this.bus.emit({
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
    });
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
