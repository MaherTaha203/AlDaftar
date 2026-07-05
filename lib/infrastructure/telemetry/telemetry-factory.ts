import { LoggerFactory } from '@/lib/core';
import { infrastructureConfig } from '../config';
import { LoggerMetrics, noopMetrics, type IMetrics } from './metrics';
import { noopTracer, type ITracer } from './tracing';

/*
 * Single place where the application obtains telemetry instruments, honoring
 * the centralized telemetry configuration.
 */
export const TelemetryFactory = Object.freeze({
  createMetrics(): IMetrics {
    if (!infrastructureConfig.telemetry.enabled) {
      return noopMetrics;
    }
    return new LoggerMetrics(LoggerFactory.create('telemetry'));
  },

  /** Returns the no-op tracer until a real tracing backend is adopted. */
  createTracer(): ITracer {
    return noopTracer;
  },
});
