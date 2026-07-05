// Telemetry — metrics, performance timing, and a future-tracing seam. No external providers.

export { LoggerMetrics, noopMetrics, type IMetrics, type MetricTags } from './metrics';
export { measure, startTimer, type Timer } from './timing';
export { noopTracer, type ISpan, type ITracer } from './tracing';
export { TelemetryFactory } from './telemetry-factory';
