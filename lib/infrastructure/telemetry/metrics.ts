import { noop, type ILogger } from '@/lib/core';

/*
 * Metrics abstraction. Emission goes through the structured logger — no
 * external providers. If a real metrics backend is ever adopted, only a new
 * IMetrics implementation is needed; call sites are unaffected.
 */

export type MetricTags = Readonly<Record<string, string | number | boolean>>;

export interface IMetrics {
  /** Counts an occurrence (default +1), e.g. cache hits or retries. */
  increment(name: string, value?: number, tags?: MetricTags): void;
  /** Records a point-in-time value, e.g. queue depth. */
  gauge(name: string, value: number, tags?: MetricTags): void;
  /** Records a duration in milliseconds. */
  timing(name: string, durationMs: number, tags?: MetricTags): void;
}

/** Emits each metric as a structured log entry. */
export class LoggerMetrics implements IMetrics {
  private readonly logger: ILogger;

  constructor(logger: ILogger) {
    this.logger = logger;
    Object.freeze(this);
  }

  increment(name: string, value = 1, tags?: MetricTags): void {
    this.logger.debug('metric.counter', { metric: name, value, ...(tags ? { tags } : {}) });
  }

  gauge(name: string, value: number, tags?: MetricTags): void {
    this.logger.debug('metric.gauge', { metric: name, value, ...(tags ? { tags } : {}) });
  }

  timing(name: string, durationMs: number, tags?: MetricTags): void {
    this.logger.debug('metric.timing', { metric: name, durationMs, ...(tags ? { tags } : {}) });
  }
}

/** Discards every metric; used when telemetry is disabled. */
export const noopMetrics: IMetrics = Object.freeze({
  increment: noop,
  gauge: noop,
  timing: noop,
});
