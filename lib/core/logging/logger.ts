import type { LogLevel } from './log-level';

/** Structured key/value data attached to a log line. Must be JSON-safe. */
export type LogContext = Readonly<Record<string, unknown>>;

/** The structured shape every emitted log line conforms to. */
export interface LogEntry {
  readonly timestamp: string;
  readonly level: LogLevel;
  readonly logger: string;
  readonly message: string;
  readonly context?: LogContext;
}

/*
 * Logging contract for the whole application. Code depends on this interface,
 * never on a concrete logger, so transports can change without touching call
 * sites.
 */
export interface ILogger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
  /** Returns a new logger that merges `context` into every entry it emits. */
  child(context: LogContext): ILogger;
}
