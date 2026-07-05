import type { IMetrics, MetricTags } from './metrics';

/*
 * Performance timing helpers, built on the metrics abstraction.
 */

export interface Timer {
  /** Milliseconds elapsed since the timer started. */
  elapsedMs(): number;
}

export function startTimer(): Timer {
  const startedAt = Date.now();
  return Object.freeze({
    elapsedMs: () => Date.now() - startedAt,
  });
}

/**
 * Runs an async operation and records its duration as a timing metric —
 * including when the operation throws (the exception propagates unchanged).
 */
export async function measure<T>(
  metrics: IMetrics,
  name: string,
  operation: () => Promise<T>,
  tags?: MetricTags,
): Promise<T> {
  const timer = startTimer();
  try {
    return await operation();
  } finally {
    metrics.timing(name, timer.elapsedMs(), tags);
  }
}
