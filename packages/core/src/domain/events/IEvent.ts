/**
 * Technical metadata about any event emitted within the system.
 */
export interface EventMetadata {
  /** The unique identifier for this event instance */
  readonly id: string;
  
  /** ISO timestamp of when the event occurred */
  readonly timestamp: string;
  
  /** Optional architectural context (source of the event) */
  readonly context?: string;
  
  /** Optional identifier to correlate multiple related events */
  readonly correlationId?: string;
}

/**
 * The standard structure for any event emitted within the system.
 */
export interface IEvent<T = any> {
  /** The name of the event type (e.g. 'LOG_EMITTED') */
  readonly type: string;
  
  /** The specific data/state associated with this event */
  readonly payload: T;
  
  /** Standardized metadata for tracking and routing */
  readonly metadata: EventMetadata;
}
