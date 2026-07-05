import { LogLevel, isLevelEnabled } from './log-level';
import type { ILogger, LogContext, LogEntry } from './logger';

export interface ConsoleLoggerOptions {
  readonly minLevel?: LogLevel;
  readonly baseContext?: LogContext;
}

const CONSOLE_METHOD: Readonly<Record<LogLevel, (message: string) => void>> = Object.freeze({
  debug: (message: string) => console.debug(message),
  info: (message: string) => console.info(message),
  warn: (message: string) => console.warn(message),
  error: (message: string) => console.error(message),
});

/*
 * Structured console transport. Every entry is emitted as a single JSON line
 * ({ timestamp, level, logger, message, context }) so output stays machine-
 * parseable in both the browser console and server stdout. No external
 * providers.
 */
export class ConsoleLogger implements ILogger {
  private readonly name: string;
  private readonly minLevel: LogLevel;
  private readonly baseContext?: LogContext;

  constructor(name: string, options: ConsoleLoggerOptions = {}) {
    this.name = name;
    this.minLevel = options.minLevel ?? LogLevel.Info;
    this.baseContext =
      options.baseContext !== undefined ? Object.freeze({ ...options.baseContext }) : undefined;
    Object.freeze(this);
  }

  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.Debug, message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log(LogLevel.Info, message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log(LogLevel.Warn, message, context);
  }

  error(message: string, context?: LogContext): void {
    this.log(LogLevel.Error, message, context);
  }

  child(context: LogContext): ILogger {
    return new ConsoleLogger(this.name, {
      minLevel: this.minLevel,
      baseContext: { ...this.baseContext, ...context },
    });
  }

  private log(level: LogLevel, message: string, context?: LogContext): void {
    if (!isLevelEnabled(level, this.minLevel)) {
      return;
    }
    const merged =
      this.baseContext !== undefined || context !== undefined
        ? { ...this.baseContext, ...context }
        : undefined;
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      logger: this.name,
      message,
      ...(merged !== undefined ? { context: merged } : {}),
    };
    CONSOLE_METHOD[level](serialize(entry));
  }
}

function serialize(entry: LogEntry): string {
  try {
    return JSON.stringify(entry);
  } catch {
    // Context contained a circular reference or non-serializable value; keep
    // the log line rather than throwing from the logger.
    return JSON.stringify({
      timestamp: entry.timestamp,
      level: entry.level,
      logger: entry.logger,
      message: entry.message,
      context: { serializationError: 'log context was not JSON-serializable' },
    });
  }
}
