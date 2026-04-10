import type { IEvent, EventMetadata } from "../domain/events/IEvent";
import type { LogLevel } from "./ILogger";

/**
 * Payload data specific to logging events.
 */
export interface LogPayload {
  readonly level: LogLevel;
  readonly message: string;
  readonly error?: unknown;
}

/**
 * Metadata specialized for logs.
 * We inherit the common EventMetadata properties (id, timestamp, context, etc.).
 */
export interface LogMetadata extends EventMetadata {
  /** Optional context name for logging identification */
  readonly context?: string;
  /** Identifies if this event was broadcasted from another worker/process */
  readonly isRemote?: boolean;
}

/**
 * The concrete event emitted for each log.
 */
export interface LogEvent extends IEvent<LogPayload> {
  readonly type: "LOG_EMITTED";
  readonly payload: LogPayload;
  readonly metadata: LogMetadata;
}
