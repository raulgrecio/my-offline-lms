import { LogBroker } from "./LogBroker";
import type { ILogger } from "./ILogger";

/**
 * A utility class to connect any ILogger implementation to the LogBroker.
 * This centralizes the event dispatching logic and keeps services clean.
 */
export class LogConnector {
  /**
   * Connects a logger to the broker.
   * Returns an unsubscribe function.
   */
  static connect(logger: ILogger, broker: typeof LogBroker): () => void {
    return broker.subscribe((entry) => {
      // Use contextual child logger if the event has a context
      const log = entry.context ? logger.withContext(entry.context) : logger;

      switch (entry.level) {
        case "info":
          log.info(entry.message);
          break;
        case "warn":
          log.warn(entry.message);
          break;
        case "error":
          log.error(entry.message, entry.error);
          break;
        case "debug":
          log.debug?.(entry.message);
          break;
      }
    });
  }
}
