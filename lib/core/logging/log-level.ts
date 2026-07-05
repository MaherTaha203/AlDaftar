/*
 * Log severity levels with an explicit ordering used for minimum-level
 * filtering. Weights are internal; consumers compare via isLevelEnabled.
 */

export const LogLevel = {
  Debug: 'debug',
  Info: 'info',
  Warn: 'warn',
  Error: 'error',
} as const;

export type LogLevel = (typeof LogLevel)[keyof typeof LogLevel];

const LOG_LEVEL_WEIGHT: Readonly<Record<LogLevel, number>> = Object.freeze({
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
});

/** True when `level` is at or above the configured minimum. */
export function isLevelEnabled(level: LogLevel, minLevel: LogLevel): boolean {
  return LOG_LEVEL_WEIGHT[level] >= LOG_LEVEL_WEIGHT[minLevel];
}
