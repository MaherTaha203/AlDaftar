import { ConsoleLogger, type ConsoleLoggerOptions } from './console-logger';
import { LogLevel } from './log-level';
import type { ILogger } from './logger';

/*
 * Single place where the application obtains loggers. Centralizing creation
 * means the transport or default level can change here without touching any
 * call site. Reads NODE_ENV directly (not lib/config/environment) so the
 * logger stays usable in contexts where app env validation must not run.
 */

function defaultMinLevel(): LogLevel {
  return process.env.NODE_ENV === 'production' ? LogLevel.Info : LogLevel.Debug;
}

export const LoggerFactory = Object.freeze({
  /** Creates a named logger. `name` should identify the emitting module. */
  create(name: string, options: ConsoleLoggerOptions = {}): ILogger {
    return new ConsoleLogger(name, {
      minLevel: options.minLevel ?? defaultMinLevel(),
      baseContext: options.baseContext,
    });
  },
});
